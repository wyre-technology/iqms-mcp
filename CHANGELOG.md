# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial scaffold of `iqms-mcp` server.
- Decision-tree navigation tools (`iqms_navigate`, `iqms_status`).
- Read tools across seven domains: work orders, inventory, BOMs, sales orders,
  purchase orders, schedule, quality.
- Write tools (workorders create / post production, inventory adjust, NCR create)
  that route through the WebAPI driver and return clear errors when the WebAPI
  module is not licensed.
- Stdio transport (local plugin mode) and Streamable HTTP transport (gateway mode)
  with per-request server lifecycle.
