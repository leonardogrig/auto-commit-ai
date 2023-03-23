# Auto Commit AI for Visual Studio Code

Auto Commit AI is a Visual Studio Code extension that generates suggested commit messages based on your staged changes. It uses OpenAI's GPT-3 to create relevant and descriptive commit messages.

## Features

- Automatically generates up to 5 commit message suggestions based on staged changes.
- Integrates seamlessly with the Git functionality in Visual Studio Code.
- Utilizes OpenAI's GPT-3 for high-quality commit message generation.

## Requirements

This extension requires an OpenAI API key to generate commit message suggestions. You will be prompted to enter your API key when you use the extension for the first time.

## How to Use

1. Stage your changes using `git add .` or through the Source Control panel in Visual Studio Code.
2. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS) to open the Command Palette.
3. Type "auto commit ai" and select the command from the list.
4. Choose a commit message from the generated suggestions.
5. The extension will automatically commit the changes with the selected commit message.

## Known Issues

Please report any issues or bugs you encounter on the [GitHub repository](https://github.com/leonardogrig/auto-commit-ai).

## Release Notes

### 0.0.5

- Initial release of the Git Commit Suggestions extension.

- Implementation of a feature sugested by https://github.com/tsomic to allow edits for the commits made. Thanks!

---

**Enjoy using Git Commit Suggestions!**
