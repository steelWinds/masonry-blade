# Security Policy

## Supported Versions

`masonry-blade` is a young project. Security fixes are typically provided for the latest release only.

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| Older   | :x:                |

## Reporting a Vulnerability

Please **do not** report security issues through public GitHub issues.

Use one of the following private channels instead:

- **GitHub Private Vulnerability Reporting** (preferred)
- Email: **kirillsurov0@gmail.com**

Reports may be submitted in **English or Russian**.

Please include:

- affected version
- runtime/environment details
- reproduction steps
- sample input/data
- impact description
- any proposed mitigation, if available

## Scope

Security-relevant issues may include:

- denial-of-service through specially crafted image metadata or input sets
- excessive CPU or memory consumption with realistic exploit potential
- worker-related message handling vulnerabilities
- package publishing or supply-chain compromise
- confirmed vulnerable dependencies with real impact on consumers

The following are generally out of scope unless they create a real security impact:

- imperfect masonry balancing
- incorrect column distribution
- rendering differences between environments
- ordinary bugs, docs issues, or feature requests

## Response Process

The maintainer will try to:

- acknowledge receipt within **7 days**
- investigate and validate the report
- prepare a fix or mitigation when needed
- coordinate responsible disclosure

## Disclosure

Please avoid public disclosure until the issue has been investigated and, when possible, fixed.
