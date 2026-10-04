# Security policy

## Reporting a problem

Please don't open a public issue for a security problem. Report it privately:
on the repository's **Security** tab, choose **Report a vulnerability**. Only the
maintainers can see what you send there.

Say what the problem is, how to see it (which page, which steps, what someone
could do with it), and anything you know about a fix. This is a volunteer
project, so expect a first answer within about a week. You'll be credited in the
fix if you'd like to be.

## What's in scope

The site is static: no accounts, no forms, no server code, and no third-party
code in the pages. Worth reporting, for example:

- a way to make a page run script that isn't its own (cross-site scripting),
  for instance through a choice it remembers on the device
- a problem in the build tools or the CI workflows that would let a pull request
  run code with more access than it should have
- a dependency with a known vulnerability that affects the build

The visitor statistics a deployment adds, and how its server is set up, belong
to that deployment: report those to whoever runs it.

## Supported versions

Fixes go into `main`, and from there into the site built from it.
