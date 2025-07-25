const validateEmail = (email, allowedDomainsString) => {
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return {
            isValid: false,
            message: "Invalid email format"
        };
    }

    // If no allowed domains are specified, skip domain validation
    if (!allowedDomainsString || allowedDomainsString.trim() === '') {
        return {
            isValid: true,
            message: "Email is valid"
        };
    }

    // Parse comma-separated domains and validate
    const allowedDomains = allowedDomainsString
        .split(',')
        .map(domain => domain.trim())
        .filter(domain => domain.length > 0);

    if (allowedDomains.length === 0) {
        return {
            isValid: true,
            message: "Email is valid"
        };
    }

    // Check if email domain is in the allowed list
    const emailDomain = email.split('@')[1].toLowerCase();
    const isAllowed = allowedDomains.some(domain => 
        emailDomain === domain.toLowerCase()
    );

    if (!isAllowed) {
        return {
            isValid: false,
            message: `Email must be from one of these domains: ${allowedDomains.join(', ')}`
        };
    }

    return {
        isValid: true,
        message: "Email is valid"
    };
}

module.exports = {
    validateEmail
}