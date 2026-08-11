---
name: "plan-local-life-service-demo"
description: "规划本地生活服务商的行业化演示：以服务商同时服务多家商户为主线，给出数据导入→商户日报→异常发现→投放/经营建议→内容与商户汇报的闭环流程，并补充服务商优先跟进视角，先选真实品类而非做大屏。"
user-invocable: true
x-xiaoba-capability-handle: "cap_1049e53f0ea94c07bde43a575de3828a"
x-xiaoba-transition-id: "transition-a225cfa3-a789-40a7-a55e-042ddad6f402"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-04/catscompany_cc_group_grp_1256.jsonl#turn-2:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-04/catscompany_cc_group_grp_1256.jsonl#turn-2:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-04/catscompany_cc_group_grp_1256.jsonl#episode-episode:2:6eff2aa6:settlement-2026-08-04T07:32:01.413Z"
---

# 规划本地生活服务商行业化演示

## 何时使用
当用户正在构思或准备“行业化演示”（demo）的内容，且场景是本地生活服务商（帮商户做广告投放、内容制作、数据分析、商业建议等）时，用本技能给出演示的定位与流程建议。

## 核心定位：演示不卖“有AI”
- 行业化演示的重点不是展示“有AI”，而是展示方案如何帮服务商同时服务几十到几百家商户。

## 建议先做一条闭环
1. 美团数据导入；
2. 生成商户日报；
3. 发现异常；
4. 给出投放和经营建议；
5. 再生成短视频脚本、直播计划，以及发给商户的汇报。

## 补充服务商视角
- 今天优先跟进哪些商户、为什么、下一步做什么。

## 落地约束
- 先选一个真实品类，不要一开始就做大屏。

## 边界
- 仅适用于匹配上述用户能力（构思本地生活服务商的行业化演示）的新任务；当用户正在修正或迭代同一任务时不要复用该模式。
- 本技能源自单一已完成的交互回合，泛化范围有限；应保持在上面的证据范围内，不扩展到其他行业、其他演示类型或具体系统实现。
