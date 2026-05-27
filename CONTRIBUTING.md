# Contributing Guide

Thank you for interest in contributing to the Agri Fertilizer Shop Management System!

## How to Contribute

### 1. Code Contributions

#### Fork and Clone
```bash
git clone https://github.com/YOUR-USERNAME/Agri.git
cd Agri
git checkout -b feature/your-feature-name
```

#### Make Your Changes
- Follow the project structure
- Write clean, commented code
- Test your changes locally

#### Commit and Push
```bash
git add .
git commit -m "Add: Your feature description"
git push origin feature/your-feature-name
```

#### Create Pull Request
- Go to repository on GitHub
- Click "New Pull Request"
- Describe your changes
- Link any related issues

### 2. Code Standards

#### Frontend (React/JavaScript)
- Use functional components with hooks
- Follow naming conventions
- Add JSDoc comments for functions
- Keep components focused and reusable

Example:
```javascript
/**
 * ProductCard component for displaying product information
 * @param {Object} product - Product data
 * @param {string} product.id - Product ID
 * @param {string} product.name - Product name
 * @returns {JSX.Element}
 */
export const ProductCard = ({ product }) => {
  return (
    // Component JSX
  );
};
```

#### Backend (Node.js/Express)
- Use async/await for asynchronous code
- Implement proper error handling
- Add input validation
- Include JSDoc comments

Example:
```javascript
/**
 * Create a new product
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void}
 */
export const createProduct = async (req, res) => {
  try {
    // Implementation
  } catch (error) {
    // Error handling
  }
};
```

### 3. Testing

Before submitting a PR, test:
- ✅ Feature works as intended
- ✅ No console errors
- ✅ Existing features not broken
- ✅ Responsive on mobile/tablet
- ✅ Dark mode works
- ✅ Error cases handled

### 4. Commit Messages

Use clear, descriptive commit messages:

```
Add: Feature description         # New feature
Fix: Bug description            # Bug fix
Docs: Documentation update      # Documentation
Style: Code style changes       # Formatting
Refactor: Code refactoring      # Improvement
Test: Testing updates           # Tests
```

## 📋 Types of Contributions

### Bug Reports
- Describe the bug clearly
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment (browser, OS, version)

### Feature Requests
- Describe the feature
- Why it's needed
- Use cases
- Suggested implementation (optional)

### Documentation
- Typo fixes
- Clarifications
- Code examples
- Additional guides

### Code Reviews
- Review pull requests
- Provide constructive feedback
- Test changes locally

## 🏗️ Project Structure

```
Agri/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Route handlers
│   │   ├── middleware/       # Custom middleware
│   │   ├── routes/          # API routes
│   │   ├── utils/           # Utility functions
│   │   └── index.js         # Main app file
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.js          # Seed script
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── context/        # Context providers
│   │   ├── utils/          # Utility functions
│   │   ├── App.jsx         # Main app component
│   │   └── main.jsx        # Entry point
│   └── package.json
│
├── README.md
├── QUICK_START.md
└── DEPLOYMENT_GUIDE.md
```

## 🔄 Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make Changes**
   - Keep commits small and focused
   - Write descriptive commit messages

3. **Test Locally**
   ```bash
   npm run dev          # Frontend
   npm run dev          # Backend (in different terminal)
   ```

4. **Push Changes**
   ```bash
   git push origin feature/amazing-feature
   ```

5. **Create Pull Request**
   - Describe what changed
   - Reference related issues
   - Request reviewers

## 📝 Pull Request Checklist

Before submitting:
- [ ] Changes follow code style
- [ ] Comments/documentation added
- [ ] Tests pass
- [ ] No console errors/warnings
- [ ] Works on different browsers
- [ ] Mobile responsive (if UI change)
- [ ] Commit messages are clear
- [ ] PR description is detailed

## 🚀 Performance Considerations

- Minimize re-renders in React
- Use proper database indexes
- Lazy load large components
- Cache API responses when appropriate
- Optimize images and assets

## 📱 Responsive Design

When adding UI features:
- Test on mobile (375px)
- Test on tablet (768px)
- Test on desktop (1920px)
- Use Tailwind responsive classes
- Test with dark mode

## 🌐 Browser Compatibility

Test on:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

## 🔐 Security Guidelines

- Never commit secrets or API keys
- Validate all user inputs
- Use environment variables for config
- Sanitize data before display
- Hash passwords with bcryptjs
- Use HTTPS in production
- Keep dependencies updated

## 📚 Documentation Requirements

For new features:
- Update README.md if needed
- Add JSDoc comments
- Document API changes
- Include usage examples
- Update DEPLOYMENT_GUIDE if needed

## 🎨 Feature Ideas

Consider contributing:
- Kannada language support
- SMS notifications
- Email integration
- Barcode scanning
- Bulk product import
- Customer loyalty points
- Advanced reports
- Mobile app
- API improvements

## 💬 Communication

- Use GitHub issues for discussions
- Be respectful and constructive
- Ask for help if stuck
- Share knowledge with others
- Give credit to collaborators

## 🏆 Recognition

Contributors will be:
- Added to CONTRIBUTORS.md
- Credited in releases
- Acknowledged in documentation

## ⚖️ License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You!

Your contributions help make this project better for everyone. Thank you for helping grow the Agri community!

---

**Happy contributing!** 🌾
# Documentation Status

This file contains older project-structure examples that may mention Prisma. For active setup and deployment, use `README.md`, `QUICK_START.md`, and `DEPLOYMENT_GUIDE.md`.
