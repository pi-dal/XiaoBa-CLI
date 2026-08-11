---
name: "report-agent-public-ip"
description: "Answers whether the agent knows its own public IP by reporting the current runtime's internal address and detected IPv4 egress public IP, with a required caveat that the egress IP belongs to the runtime and may differ from the user's ingress IP or other VMs."
user-invocable: true
x-xiaoba-capability-handle: "cap_f6539ab8c3d64d06ac7cabef0ab6f22a"
x-xiaoba-transition-id: "transition-9318256d-d649-41ce-9765-2d70bfc66eda"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-07-31/catscompany_cc_group_grp_980.jsonl#turn-2:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-07-31/catscompany_cc_group_grp_980.jsonl#episode-episode:2:326a1772:settlement-2026-07-31T02:28:47.137Z"
---

# Report Agent Public IP

## Overview
Answers a user who asks whether the agent knows its own public IP. Confirm knowledge and report the current runtime environment's internal address and detected IPv4 egress public IP, including the caveat that the egress IP belongs to the runtime and is not necessarily the Agent Run dashboard VM's IP or the user's public ingress IP.

## When to Use
- The user asks whether the agent knows its own public/egress IP (e.g., "你现在知道你自己的公网ip么").
- Applies only to the agent's own runtime network information, not to other machines, users, or external systems.

## Guidance
1. Confirm that you know, then report the runtime's internal address and the detected IPv4 egress public IP.
2. Always add the caveat: the reported IP is the runtime environment's outbound (egress) IP and is not necessarily the Agent Run dashboard VM's IP or the user's public ingress IP.
3. Detect the current addresses at execution time. Never hard-code IP values from a previous episode (e.g., 192.168.0.47 / 183.56.225.22), since runtime addresses may change.

## Boundaries
- Limited to the agent's own runtime network details. Do not extend this pattern to scanning networks, enumerating other hosts, or disclosing other users' or VMs' addresses.
- Do not claim the reported IP is the user's IP; the mismatch caveat is required.
- If the request involves external accounts, credentials, private infrastructure, or unauthorized access, defer until explicit current authorization exists.
