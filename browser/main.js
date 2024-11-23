function isColor(r, g, b) {
    return r >= 240 && g <= 10 && b <= 10;
}


const debug = document.querySelector('#debug');


const socket = new WebSocket('ws://127.0.0.1:42069');
socket.onerror = (ev) => {
    document.body.textContent = 'WebSocket connection failed';
    // console.log(ev);
    // return;
}
socket.onclose = (ev) => {
    document.body.textContent = 'WebSocket disconnected';
}

document.querySelector('#start').addEventListener('click', async function(ev) {
    /** @type {HTMLInputElement} */
    const frameRateInput = document.querySelector('#frame-rate');
    const frameRate = frameRateInput.value * 1;

    /** @type {DisplayMediaStreamOptions} */
    const displayMediaOptions = {
        video: {
            frameRate: frameRate
        },
        audio: false,
    };

    const mediaStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

    const videoTrack = mediaStream.getVideoTracks()[0];
    const mediaTrackSettings = videoTrack.getSettings();
    console.log('mediaTrackSettings', 'width', mediaTrackSettings.width, 'height', mediaTrackSettings.height);

    // const offscreenCanvas = document.querySelector('canvas');
    const offscreenCanvas = new OffscreenCanvas(mediaTrackSettings.width, mediaTrackSettings.height);
    window.offscreenCanvas = offscreenCanvas;
    /**@type {OffscreenCanvasRenderingContext2D} */
    const ctx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
    ctx.canvas.width = mediaTrackSettings.width;
    ctx.canvas.height = mediaTrackSettings.height;

    const trackProcessor = new MediaStreamTrackProcessor({ track: videoTrack });

    const transformer = new TransformStream({
        /**
         * @param {VideoFrame} videoFrame 
         * @param {*} controller 
         */
        async transform(videoFrame, controller) {
            try {
                const sx = videoFrame.displayWidth >> 1;
                const sy = videoFrame.displayHeight >> 1;

                // ctx.canvas.width = videoFrame.displayWidth;
                // ctx.canvas.height = videoFrame.displayHeight;
                ctx.drawImage(videoFrame, 0, 0, videoFrame.displayWidth, videoFrame.displayHeight);

                const imageData = ctx.getImageData(sx, sy, 1, 1);
                // debug.textContent = imageData.data;
                // window.imageData = imageData.data;
                // console.log(imageData.data[0], imageData.data[1], imageData.data[2]);

                isColor(imageData.data[0], imageData.data[1], imageData.data[2]) && socket.send('shoot');

                // controller.enqueue(videoFrame);
                videoFrame.close();
            } finally {
                videoFrame.close();
            }
        },
    });
    trackProcessor.readable.pipeThrough(transformer).pipeTo(new WritableStream());
});

