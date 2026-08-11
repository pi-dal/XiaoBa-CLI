---
name: "record-opencli-terminal-screen"
description: "Records the agent's genuine real-time opencli terminal operations as an mp4 screen recording and delivers the file to the current chat, when the user asks to 录屏 (record) the actual opencli operation process."
user-invocable: true
x-xiaoba-capability-handle: "cap_abfd395ad08c4d9c899ca853715d5812"
x-xiaoba-transition-id: "transition-c89faaef-e8ce-4beb-adcc-bf5f69283ed2"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-04/catscompany_cc_group_grp_1271.jsonl#turn-2:delivery:send_file, /home/xiaoba/app/logs/sessions/catscompany/2026-08-04/catscompany_cc_group_grp_1271.jsonl#episode-episode:2:cbc54bc7:settlement-2026-08-04T08:30:00.377Z"
---

# Record Actual opencli Terminal Operations as a Real-Time Screen Recording

## When to use
Use this capability when the user asks the agent to 录屏 (screen-record) the **actual** opencli operation process — for example: "我要你录屏你实际opencli操作的过程" (record the process of your actual opencli operations). The user wants to see the real execution, not a simulation.

## Core requirement
- The delivered recording must be a **genuine real-time capture** of actual opencli commands being executed in the terminal — including command input, command output, and completion of the operation.
- It must **not** be a replay, demo playback, pre-rendered animation, or re-enactment. If a previously delivered version was only a playback demo (回放演示) and the user says it does not meet the requirement, redo the task as a live capture and re-send the corrected version.

## How to perform it
1. **Confirm the ask**: verify the user wants a live recording of the actual opencli operations for the task at hand (the evidence episode involved opencli data-collection commands: a search command, repeated `detail --replies` commands, and output of hot replies).
2. **Set up live capture**: start a real-time terminal screen recording in the current local session before running the opencli commands, so the capture shows the commands being typed/executed as they happen.
3. **Run the actual opencli operations** while the recording is active; keep the recording running until the operations complete so the full process (commands entered, outputs shown, completion prompt) is captured.
4. **Produce the video file**: finalize the capture as an `.mp4` file with a descriptive file name (e.g., `虎扑实际opencli操作_实时终端录屏.mp4`) in the working directory.
5. **Deliver to the user**: send the mp4 file to the current chat via `send_file`, passing the resolved file path and the file name, and briefly confirm what the recording shows.

## Boundaries
- Apply only when the user explicitly requests recording of the **actual** opencli operation process. Do not apply to replay/demo requests or to unrelated screen-recording requests.
- Do not reuse this pattern while the user is still correcting or iterating on the recording task itself; deliver the corrected live version rather than repeating the same approach.
- Do not extend this guidance to other tools, arbitrary screen recording, or recording of non-opencli operations.
- Do not inherit any access or permissions beyond the current local session; only record and deliver what is available in the present working session.
