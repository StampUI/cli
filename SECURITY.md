# Security Policy

## Supported versions

Only the latest published version of `stampui` on npm receives security fixes.

## Reporting a vulnerability

Please do not open a public issue for security problems. Email **support@stampui.com** with:

- A description of the issue and its impact
- Steps to reproduce
- The version affected (`stampui --version`)

You will get an acknowledgement within a few days. Please give us a reasonable window to ship a fix before public disclosure.

## Scope notes

- The CLI writes files into the current working directory based on registry manifests. If you believe a manifest or block could be used to write outside the project directory or execute code at install time, that is in scope and we want to know.
- License keys are stored locally in `~/.stampui/config.json` and sent only to the StampUI registry over HTTPS. Reports about key handling are in scope.
- Issues that only affect the commercial registry service (stampui.com) can also be reported to the same address.
