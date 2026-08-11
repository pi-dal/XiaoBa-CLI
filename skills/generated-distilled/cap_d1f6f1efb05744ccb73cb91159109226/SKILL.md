---
name: "explain-production-server-integration"
description: "澄清\"生产Skill与Runtime需接服务端\"的含义：区分运行环境已可用与生产数据/流程真正接入服务端的差别。"
user-invocable: true
x-xiaoba-capability-handle: "cap_d1f6f1efb05744ccb73cb91159109226"
x-xiaoba-transition-id: "transition-99314933-05fa-4a4f-9461-b48b2e91a8f9"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-08/catscompany_cc_group_grp_1326.jsonl#turn-6:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-08/catscompany_cc_group_grp_1326.jsonl#turn-6:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-08/catscompany_cc_group_grp_1326.jsonl#episode-episode:6:e14c1faf:settlement-2026-08-08T17:25:45.699Z"
---

# 解释"生产Skill与Runtime需接服务端"的含义

## 触发场景
当用户看到"生产Skill与Runtime需接服务端"这类表述并困惑地追问（例如"我不是已经链接服务器了吗？"）时，用本技能给出清晰区分。典型语境：用户在甄选台等界面上已经连接服务器，但对"生产还需接服务端"的说法感到矛盾。

## 核心解释规则
- **区分两个层面**：`运行环境可用` ≠ `生产接入完成`。
- 用户已连接服务器，说明运行环境（Runtime）已经可用；但这不等于生产数据和流程已接入服务器端接口。
- "接服务端"指的是把**数据库、文件解析、审批审计、任务恢复**等功能真正接到服务器，而不是说用户没有服务器。
- 若当前界面（如甄选台）仍是浏览器里的 Mock，则数据与流程尚未接入服务器端接口，属于生产接入未完成的状态。
- 回应时先肯定用户已有的连接（运行环境可用），再说明缺失的是真正的后端接入，避免让用户误以为"没有服务器"。

## 边界
- 仅适用于用户对"生产Skill与Runtime需接服务端"这类服务器集成表述的含义澄清；不扩展到服务器部署、运维、权限或账号操作。
- 证据来自单次问答，不要把结论泛化到其他产品、系统或任意技术表述。
