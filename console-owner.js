// Prints, as JSON { pid: hwnd }, the window that shows each given process's
// console. focus.js runs it as a child process (ELECTRON_RUN_AS_NODE=1) when
// its own lookups find nothing. It attaches to each console in turn, which is
// why it runs apart from the tray: while attached, a Ctrl+C or a closed
// console there reaches this process, not the tray.
'use strict';
const koffi = require('koffi');

const k32 = koffi.load('kernel32.dll');
const u32 = koffi.load('user32.dll');
const FreeConsole = k32.func('bool __stdcall FreeConsole()');
const AttachConsole = k32.func('bool __stdcall AttachConsole(uint32_t pid)');
const GetConsoleWindow = k32.func('intptr_t __stdcall GetConsoleWindow()');
const GetWindow = u32.func('intptr_t __stdcall GetWindow(intptr_t h, uint32_t cmd)');

const out = {};
FreeConsole(); // a process can attach to one console at a time
for (const arg of process.argv.slice(2)) {
  const pid = Number(arg);
  if (!Number.isInteger(pid) || pid <= 0 || !AttachConsole(pid)) continue;
  const hwnd = Number(GetConsoleWindow());
  FreeConsole();
  // Windows Terminal's PseudoConsoleWindow is hidden and owned by the terminal
  // window its tab is in; a classic console window is the window itself.
  if (hwnd) out[pid] = Number(GetWindow(hwnd, 4)) || hwnd; // GW_OWNER
}
process.stdout.write(JSON.stringify(out));
