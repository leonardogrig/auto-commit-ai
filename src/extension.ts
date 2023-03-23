import * as vscode from 'vscode';
import axios, { AxiosError } from 'axios';
import git from 'simple-git';

import { Configuration, OpenAIApi } from 'openai';

function isRateLimitError(error: AxiosError) {
	return error.response?.status === 429;
}

async function hasUnstagedChanges() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		return false;
	}

	const gitInstance = git(workspaceFolders[0].uri.fsPath);
	const statusSummary = await gitInstance.status();

	return statusSummary.files.some(file => file.index !== 'A' && file.index !== 'M');
}

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

		// Get the staged changes
		const stagedChanges = await getStagedChanges();

		// Check if there are no staged changes
		if (!stagedChanges || stagedChanges.trim() === '') {
			vscode.window.showInformationMessage('There are no changes to commit.');
			return;
		}

		const suggestions = await generateCommitSuggestions(apiKey, stagedChanges, 5);

		if (!suggestions || suggestions.length === 0) {
			return;
		}

		const selectedCommitMessage = await vscode.window.showQuickPick(suggestions, {
			placeHolder: 'Select a commit message',
			ignoreFocusOut: true,
		});

		if (selectedCommitMessage) {
			const commitMessageWithoutNumber = selectedCommitMessage.replace(/^\d+\.\s*/, '');

			const userAction = await vscode.window.showQuickPick(['Commit', 'Place in terminal'], {
				placeHolder: 'Choose an action',
				ignoreFocusOut: true,
			});

			if (userAction === 'Commit') {
				commitToGit(commitMessageWithoutNumber);
			} else if (userAction === 'Place in terminal') {
				placeInTerminal(commitMessageWithoutNumber);
			}
		}
	});

	context.subscriptions.push(disposable);
}

function commitToGit(commitMessage: string) {
	const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
	terminal.show();
	terminal.sendText(`git commit -m "${commitMessage}"`);
}

function placeInTerminal(commitMessage: string) {
	const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
	terminal.show();
	terminal.sendText(`git commit -m "${commitMessage}"`, false);
}

async function getOpenAIKey(forceNewKey = false): Promise<string | undefined> {
	const configuration = vscode.workspace.getConfiguration('gitCommitSuggestions');
	let apiKey = forceNewKey ? undefined : configuration.get<string>('openAIKey');

	if (!apiKey) {
		apiKey = await vscode.window.showInputBox({
			prompt: 'Digite sua chave da API OpenAI',
			ignoreFocusOut: true,
			password: true,
		});

		if (apiKey) {
			configuration.update('openAIKey', apiKey, vscode.ConfigurationTarget.Global);
		}
	}

	return apiKey;
}



async function getStagedChanges(): Promise<string> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		return '';
	}
	// try this extension
	const gitInstance = git(workspaceFolders[0].uri.fsPath);
	const diffSummary = await gitInstance.diff(['--staged']);

	return diffSummary;
}




async function generateCommitSuggestions(apiKey: string, prompt: string, numSuggestions: number): Promise<string[] | undefined> {
	const configuration = new Configuration({
		apiKey: apiKey,
	});
	const openai = new OpenAIApi(configuration);

	try {
		const response = await openai.createCompletion({
			model: 'text-davinci-003',
			prompt: `Given the Git commit history: ${prompt}\n\nSuggest a commit message. If a new feature was added, the message should start with "feat: ", if a fix was made it should start with "fix: " :\n`,
			temperature: 0.5,
			max_tokens: 50,
			top_p: 1,
			frequency_penalty: 0,
			presence_penalty: 0,
			n: numSuggestions,
		});

		const uniqueSuggestions = Array.from(new Set(response.data.choices.map(choice => (choice.text ?? '').trim())));
		const suggestions = uniqueSuggestions.map((suggestion, index) => `${index + 1}. ${suggestion}`);

		return suggestions;
	} catch (error) {
		if (axios.isAxiosError(error) && isRateLimitError(error)) {
			vscode.window.showErrorMessage('Sua chave da API expirou. Por favor, insira outra chave.');
			const newApiKey = await getOpenAIKey(true);
			if (newApiKey) {
				return generateCommitSuggestions(newApiKey, prompt, numSuggestions);
			}
		} else {
			throw error;
		}
	}

	// Adicione um retorno explícito de 'undefined' no final da função
	return undefined;
}



