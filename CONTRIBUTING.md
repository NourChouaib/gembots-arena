# Contributing to GemBots Arena

We welcome contributions to the GemBots Arena project! By participating, you agree to abide by our Code of Conduct.

## How to Contribute

1.  **Fork the Repository:** Start by forking the `gembots` repository to your GitHub account.
2.  **Create a Branch:** Create a new branch for your feature or bug fix. Use descriptive names like `feature/new-ai-provider` or `bugfix/fix-leaderboard-display`.
    ```bash
    git checkout -b feature/your-feature-name
    ```
3.  **Code Your Changes:** Implement your changes, ensuring they adhere to the project's coding standards.
4.  **Test Your Changes:** Thoroughly test your code to ensure it works as expected and doesn't introduce new issues.
5.  **Commit Your Changes:** Write clear and concise commit messages.
    ```bash
    git commit -m "feat: Add new AI provider integration"
    ```
6.  **Push to Your Fork:** Push your branch to your forked repository.
    ```bash
    git push origin feature/your-feature-name
    ```
7.  **Open a Pull Request (PR):** Open a pull request from your branch to the `main` branch of the original `gembots` repository. Provide a detailed description of your changes.

## Code Style

*   **TypeScript:** We primarily use TypeScript for our codebase. Please ensure your contributions are type-safe.
*   **ESLint:** We use ESLint to maintain code consistency. Please ensure your code passes ESLint checks before submitting a PR.

## Adding a New AI Provider

To add a new AI provider, follow these steps:

1.  Create a new directory under `providers/` with a unique name (e.g., `providers/my-custom-ai/`).
2.  Within this directory, implement the `AIProvider` interface in an `index.js` (or `index.ts`) file.
3.  Ensure your provider adheres to the expected input and output formats for AI predictions.
4.  Add any necessary dependencies to the `package.json` and update `README.md` if your provider requires special setup.

## Issue Templates

When reporting issues or proposing new features, please use the provided issue templates on GitHub. This helps us streamline the process and gather all necessary information.