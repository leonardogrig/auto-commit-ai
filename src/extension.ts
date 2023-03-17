import * as vscode from 'vscode';
import axios from 'axios';
import git from 'simple-git';

import { Configuration, OpenAIApi } from 'openai';



export async function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "git-commit-suggestions" is now active!');

	// Register the command
	const disposable = vscode.commands.registerCommand('extension.gitCommitSuggestions', async () => {
		const apiKey = await getOpenAIKey();
		if (await hasUnstagedChanges()) {
			const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
			terminal.show();
			terminal.sendText('git status');
			vscode.window.showInformationMessage('You need to stage your changes with "git add ." before using this extension.');
			return;
		}
		
		


		if (!apiKey) {
			vscode.window.showErrorMessage('Please provide your OpenAI API key to use this extension.');
			return;
		}

		// Set up the axios instance with the appropriate headers
		const axiosInstance = axios.create({
			baseURL: 'https://api.openai.com/v1/',
			timeout: 10000,
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`,
			},
		});

		// TODO: Implement the Git commit suggestions functionality
		const stagedChanges = await getStagedChanges();

		async function hasUnstagedChanges() {
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders) {
				return false;
			}

			const gitInstance = git(workspaceFolders[0].uri.fsPath);
			const statusSummary = await gitInstance.status();

			return statusSummary.files.some(file => file.index !== 'A' && file.index !== 'M');
		}



		const commitMessages = stagedChanges;

		const suggestions = await generateCommitSuggestions(apiKey, commitMessages, 5);


		const selectedCommitMessage = await vscode.window.showQuickPick(suggestions, {
			placeHolder: 'Select a commit message',
			ignoreFocusOut: true,
		});

		if (selectedCommitMessage) {
			const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
			terminal.show();

			const commitMessageWithoutNumber = selectedCommitMessage.replace(/^\d+\.\s*/, '');
			terminal.sendText(`git commit -m "${commitMessageWithoutNumber}"`);
		}



	});

	context.subscriptions.push(disposable);
}


async function getOpenAIKey(): Promise<string | undefined> {
	const configuration = vscode.workspace.getConfiguration('gitCommitSuggestions');
	let apiKey = configuration.get<string>('openAIKey');

	if (!apiKey) {
		apiKey = await vscode.window.showInputBox({
			prompt: 'Enter your OpenAI API key',
			ignoreFocusOut: true,
			password: true,
		});

		if (apiKey) {
			configuration.update('openAIKey', apiKey, vscode.ConfigurationTarget.Global);
		}
	}

	return apiKey;
}



async function getStagedChanges() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		return '';
	}

	const gitInstance = git(workspaceFolders[0].uri.fsPath);
	const diffSummary = await gitInstance.diff(['--staged']);

	return diffSummary;
}



async function generateCommitSuggestions(apiKey: string, prompt: string, numSuggestions: number) {
	const configuration = new Configuration({
		apiKey: apiKey,
	});
	const openai = new OpenAIApi(configuration);

	const response = await openai.createCompletion({
		model: 'text-davinci-003',
		prompt: `Given the Git commit history: ${prompt}\n\nSuggest a commit message. If a new feature was added, the message should start with "feat: ", if a fix was made it should start with "fix: " :\n`,
		temperature: 0.5,
		max_tokens: 50,
		top_p: 1,
		frequency_penalty: 0,
		presence_penalty: 0,
		n: numSuggestions,
		stop: null,
	});

	const uniqueSuggestions = Array.from(new Set(response.data.choices.map(choice => (choice.text ?? '').trim())));
	const suggestions = uniqueSuggestions.map((suggestion, index) => `${index + 1}. ${suggestion}`);



	return suggestions;
}



