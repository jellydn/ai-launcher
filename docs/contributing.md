# Contributing

Thank you for considering contributing to AI CLI Switcher! 🎉

## Ways to Contribute

- 🐛 **Report bugs**: File issues with clear descriptions and reproduction steps
- ✨ **Suggest features**: Share ideas for new features or improvements
- 📝 **Improve documentation**: Fix typos, add examples, clarify instructions
- 💻 **Submit code**: Fix bugs, implement features, or improve performance
- 🧪 **Add tests**: Improve test coverage and quality

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) - Fast JavaScript runtime
- Git
- A GitHub account

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-cli-switcher
   cd ai-cli-switcher
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/jellydn/ai-cli-switcher
   ```

### Install Dependencies

```bash
bun install
```

## Development Workflow

1. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/my-feature
   # or
   git checkout -b fix/my-bugfix
   ```

2. **Make your changes** following the code style guidelines

3. **Run tests**:
   ```bash
   bun test
   ```

4. **Type check**:
   ```bash
   bun run typecheck
   ```

5. **Lint and format**:
   ```bash
   bun run check:fix
   ```

6. **Test manually**:
   ```bash
   bun run src/index.ts
   ```

7. **Build**:
   ```bash
   bun run build
   ```

8. **Commit your changes** with a clear message:
   ```bash
   git commit -m "feat: add new feature"
   # or
   git commit -m "fix: resolve issue with X"
   ```

9. **Push to your fork**:
   ```bash
   git push origin feature/my-feature
   ```

10. **Create a Pull Request** on GitHub

## Code Style

### General Guidelines

- Follow the existing code style
- Write clear, self-documenting code
- Add comments for complex logic
- Keep functions small and focused
- Use TypeScript strict mode

### TypeScript

- No `any` - use `unknown` for truly dynamic values
- Explicit return types for public functions
- Use type guards for runtime type checks
- Leverage TypeScript's type system

### Formatting

- Line width: 100 characters
- Double quotes (`"`)
- Semicolons required
- 2 space indentation

### Naming

- Interfaces: PascalCase (`Tool`, `Config`)
- Functions/variables: camelCase (`detectTools`, `configPath`)
- Constants: UPPER_SNAKE_CASE (`CONFIG_PATH`)
- Booleans: is/has/should prefix (`isValid`, `hasAlias`)

## Testing Guidelines

- Add tests for new features
- Update tests for bug fixes
- Test behavior, not implementation
- Use descriptive test names
- Keep tests focused and isolated

### Test Structure

```typescript
import { describe, test, expect } from "bun:test";

describe("Feature name", () => {
  test("should do something specific", () => {
    // Arrange
    const input = "test";
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe("expected");
  });
});
```

## Commit Messages

Use clear, descriptive commit messages following Conventional Commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add support for custom aliases
fix: resolve issue with template expansion
docs: update installation instructions
test: add tests for config validation
```

## Pull Request Guidelines

1. **Title**: Clear, descriptive title
2. **Description**: Explain what and why
3. **Tests**: Include relevant tests
4. **Documentation**: Update docs if needed
5. **Breaking changes**: Clearly note any breaking changes
6. **Link issues**: Reference related issues

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test these changes

## Checklist
- [ ] Tests pass
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Documentation updated
```

## Reporting Issues

### Bug Reports

Include:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Bun version, etc.)
- Error messages or logs

Example:
```markdown
**Description**
Brief description of the bug

**To Reproduce**
1. Run `ai <command>`
2. See error

**Expected Behavior**
What should happen

**Environment**
- OS: macOS 13.0
- Bun: 1.0.0
- Version: 0.2.1

**Error Message**
```
error message here
```
```

### Feature Requests

Include:
- Clear title and description
- Use case and motivation
- Proposed solution (optional)
- Alternatives considered (optional)

## Code Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, maintainer will merge

## Questions?

- Open an issue for questions
- Check existing issues and PRs
- See [Development Guide](development.md) for more details

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in the project. Thank you for helping make AI CLI Switcher better! 🙏
