# Security Policy

## Supported versions

`masonry-blade` is a young project. Security fixes are generally provided for the latest release only.

| Version | Supported |
| ------- | --------- |
| Latest  | ✅        |
| Older   | ❌        |

## Reporting a vulnerability

Please do not report security issues through public GitHub issues.

Use one of these private channels instead:

- GitHub Private Vulnerability Reporting
- Email: **kirillsurov0@gmail.com**

Reports may be submitted in English or Russian.

To help with triage, please include:

- affected version
- runtime or environment details
- reproduction steps
- sample input or data
- impact description
- possible mitigation, if available

## Security scope

Issues that may be security-relevant include:

- denial of service caused by specially crafted image metadata or input sets
- excessive CPU or memory consumption with realistic exploit potential
- worker-related message handling issues with real security impact
- package publishing or supply-chain compromise
- confirmed vulnerable dependencies that can affect consumers

The following are usually out of scope unless they create a real security impact:

- imperfect masonry balancing
- incorrect column distribution
- rendering differences between environments
- ordinary bugs, documentation issues, or feature requests

## Response process

The maintainer will try to:

- acknowledge receipt within 7 days
- investigate and validate the report
- prepare a fix or mitigation when needed
- coordinate responsible disclosure

## Disclosure

Please avoid public disclosure until the issue has been investigated and, when possible, fixed.
