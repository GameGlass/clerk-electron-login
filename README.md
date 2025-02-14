# clerk-electron-login

Example clerk login with Electron. Built using pnpm but should work with npm or yarn.

Before starting, fill in the `VITE_CLERK_PUBLIC_KEY` variable with your own key in the file `.env`, then run the example by doing:
```bash
pnpm install
pnpm start
```


## Mac & Windows & Linux

for Overwolf electron please update the `ELECTRON_EXEC_PATH` in the package.json or switch back to stock electron

The following needs to be added to `start:preview`, `build`, `build:release` and `start`

`ELECTRON_EXEC_PATH=node_modules/@overwolf/ow-electron/dist/electron`
