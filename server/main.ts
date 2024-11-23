function cstr2ptrW(cstr: string) {
	const buffer = new ArrayBuffer((cstr.length + 1) * 2);
	const u16 = new Uint16Array(buffer);
	for (let i = 0; i <= cstr.length; i++) {
		u16[i] = cstr.charCodeAt(i);
	}
	return Deno.UnsafePointer.of(u16);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const user32 = Deno.dlopen(`${Deno.env.get('SystemRoot')}\\system32\\user32.dll`, {
    'FindWindowW': { 
		parameters: ['pointer', 'pointer'],
		result: 'pointer'
	},
    'GetCursorInfo': {
        parameters: ['pointer'],
        result: 'bool'
    },
    'GetForegroundWindow': { 
		parameters: [],
		result: 'pointer'
	},
    'keybd_event': { 
		parameters: ['u8', 'u8', 'u32', 'isize'],
		result: 'void'
	},
});

function isActiveWindow(hwnd: Deno.PointerValue<unknown>) {
    return Deno.UnsafePointer.value(user32.symbols.GetForegroundWindow()) == Deno.UnsafePointer.value(hwnd);
}

function isCursorShowing() {
    const pci = new Uint8Array(24);
    new DataView(pci.buffer).setUint32(0, pci.length, true);
    if (user32.symbols.GetCursorInfo(Deno.UnsafePointer.of(pci))) {
        return !!(new DataView(pci.buffer).getUint32(4, true));
    } else {
        throw Error('GetCursorInfo error');
    }
}

async function press(vk: number) { // 0x50 P
    user32.symbols.keybd_event(vk, 0, 0, BigInt(0));
    await sleep(10);
    user32.symbols.keybd_event(vk, 0, 2, BigInt(0));
}

// console.log(isCursorShowing());
const windowName = 'PortalWars  ';
const hwnd = user32.symbols.FindWindowW(null, cstr2ptrW(windowName));
console.log(Deno.UnsafePointer.value(hwnd).toString(16));
// await sleep(2000);
// await press(0x50);
// Deno.exit();

Deno.serve({
    port: 42069,
    hostname: '127.0.0.1'
}, (req) => {
    const { socket, response } = Deno.upgradeWebSocket(req);
    socket.addEventListener("open", () => {
        console.log("a client connected!");
    });
    socket.addEventListener('message', (event) => {
        switch (event.data) {
            case 'ping':
                socket.send("pong");
                break;
            case 'shoot':
                // console.log('shoot');
                if (isActiveWindow(hwnd) && !isCursorShowing()) {
                    press(0x50);
                }
                break;
        }
    });
    return response;
});
