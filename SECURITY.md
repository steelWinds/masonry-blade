# Security Policy

## Supported versions

`masonry-blade` is a young project. Security fixes are generally provided for the latest published release only.

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

- Affected version
- Runtime or environment details
- Reproduction steps
- Sample input or data
- Impact description
- Whether worker mode was enabled, disabled, or unavailable
- Any known mitigation or workaround

## What is likely in scope

Issues that may be security-relevant include:

- Algorithmic denial of service from specially crafted large inputs with realistic exploit potential
- Excessive CPU or memory consumption with realistic exploit potential
- Worker message handling issues with real security impact
- Package publishing or supply-chain compromise
- Confirmed vulnerable dependencies that can affect consumers of the package

## What is usually out of scope

The following are usually out of scope unless they create a real security impact:

- Imperfect masonry balancing
- Incorrect column distribution
- Normal validation failures for invalid input
- Rendering differences between environments
- Errors caused by non-cloneable `meta` values in worker mode
- API misunderstandings around `recreate({ ... })` with omitted `items`
- Documentation bugs, API ergonomics issues, or feature requests
- Environment-specific worker setup problems without a security consequence

## Current attack surface

`masonry-blade` is a layout engine. It does not fetch remote content, manipulate the DOM by itself, or execute arbitrary user code on behalf of consumers.

That means the most realistic security reports are likely to involve:

- Algorithmic denial of service
- Memory pressure from hostile input
- Worker transport behavior
- Package integrity or supply-chain issues

Framework rendering bugs, UI issues, and application-specific misuse are usually outside the library's scope.

## Response process

The maintainer will try to:

- Acknowledge receipt within 7 days
- Investigate and validate the report
- Prepare a fix or mitigation when needed
- Coordinate responsible disclosure

## Disclosure

Please avoid public disclosure until the issue has been investigated and, when possible, fixed.
