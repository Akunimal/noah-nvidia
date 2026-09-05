# Donor provenance

Noah Nvidia is a new repository created from the Phoenix Command Console SaaS
at implementation time. The donor remains at its original path and its dirty
working tree was not reset, stashed, checked out, deployed, or relinked.

The implementation uses the donor as a design and behavior reference for:

- compact chat message presentation and approval cards;
- agenda and availability information architecture;
- contact, catalog, and operational summary vocabulary; and
- the pattern of showing pending work and explicit owner decisions.

No donor source file, database migration, production asset, customer fixture,
credential, environment value, Git history, or deployment configuration is
included in this repository. The CSS in apps/web/src/styles/noah-nvidia.css is
new and does not copy the donor stylesheet. The Atlas Services data under
fixtures/ is synthetic.

The donor is commercial software. This repository carries its own Apache-2.0
license and makes no license claim over the donor codebase. If a future change
copies a specific donor file, record its public path, commit hash, license
status, and the reviewed import list in this document before committing it.
