# Security Policy

## Supported Versions

We actively maintain and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

### 🚨 Immediate Actions

1. **DO NOT** create a public GitHub issue
2. **DO NOT** discuss the vulnerability in public forums
3. **DO NOT** share the vulnerability with others

### 📧 Report Process

1. **Email Security Team**: Send details to [contact@multisync.io](mailto:contact@multisync.io)
2. **Include Details**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if available)

### 🔒 What to Include

- **Vulnerability Type**: Buffer overflow, injection, etc.
- **Affected Components**: Which parts of the code are vulnerable
- **Attack Vector**: How the vulnerability can be exploited
- **Proof of Concept**: Code or steps to demonstrate the issue
- **Environment**: OS, Node.js version, dependencies

### ⏱️ Response Timeline

- **Initial Response**: Within 48 hours
- **Assessment**: Within 1 week
- **Fix Development**: Based on severity (1-4 weeks)
- **Public Disclosure**: After fix is available

## Security Best Practices

### For Users

- **Keep Updated**: Always use the latest stable version
- **Environment Variables**: Store sensitive data securely
- **Network Security**: Use HTTPS for HTTP MCP servers
- **Access Control**: Limit file system permissions

### For Developers

- **Input Validation**: Validate all user inputs
- **Output Sanitization**: Sanitize data before output
- **Dependency Updates**: Keep dependencies updated
- **Security Headers**: Implement proper security headers

## Vulnerability Disclosure

### Coordinated Disclosure

We follow a coordinated disclosure policy:

1. **Private Fix**: Develop and test security fixes privately
2. **Release**: Publish fixed version to npm
3. **Advisory**: Release security advisory with details
4. **Documentation**: Update security documentation

### CVE Assignment

- Critical vulnerabilities receive CVE IDs
- Medium and low issues documented in advisories
- All fixes documented in changelog

## Security Features

### Built-in Protections

- **Input Validation**: Zod schema validation
- **Sandboxing**: Isolated function evaluation
- **Error Handling**: Secure error messages
- **Network Timeouts**: Prevent hanging connections

### Configuration Security

- **Environment Variables**: Secure credential storage
- **File Permissions**: Minimal required access
- **Network Validation**: URL and protocol validation
- **MCP Security**: Secure server communication

## Contact Information

### Security Team

- **Email**: [contact@multisync.io](mailto:contact@multisync.io)
- **PGP Key**: Available upon request
- **Response Time**: 24-48 hours

### Emergency Contacts

For critical security issues requiring immediate attention:

- **GitHub Security**: [Security Advisories](https://github.com/Multi-Sync/multisync/security/advisories)
- **Direct Contact**: Available for verified security researchers

## Acknowledgments

We appreciate security researchers who:

- Follow responsible disclosure practices
- Provide detailed vulnerability reports
- Allow time for proper fix development
- Help improve our security posture

---

**Thank you for helping keep Multisync secure!** 🔒

For general support, visit [multisync.io](https://multisync.io) or use [GitHub Issues](https://github.com/Multi-Sync/multisync/issues).
