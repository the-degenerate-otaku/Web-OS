const AppRegistry = {};

function registerApp(id, config = {}) {
    AppRegistry[id] = config;
}

function createApp({ id, title, icon, width = 400, height = 200, x = 100, y = 100, content, onOpen, onClose }) {
    const win = document.createElement('div');
    win.id = id;
    win.className = 'window hidden';
    win.style.top = `${y}px`;
    win.style.left = `${x}px`;
    win.style.width = `${width}px`;

    const header = document.createElement('div');
    header.className = 'window-header';
    header.setAttribute('onmousedown', `dragWindow(event, '${id}')`);

    const titleSpan = document.createElement('span');
    titleSpan.textContent = title;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.onclick = () => closeWindow(id);

    header.append(titleSpan, closeBtn);

    const contentEl = document.createElement('div');
    contentEl.className = 'window-content';
    contentEl.style.minHeight = `${height}px`;

    win.append(header, contentEl);
    document.getElementById('desktop').appendChild(win);

    if (typeof content === 'function') content(contentEl);

    registerApp(id, { title, icon, onOpen, onClose });
    return win;
}

registerApp('window-terminal', { title: 'Flux Terminal', icon: '>_' });
registerApp('window-pet', { title: 'Desktop Pet', icon: '👾' });
registerApp('window-settings', { title: 'System Settings', icon: '⚙️' });
registerApp('window-addapp', { title: 'Add to Dock', icon: '➕' });

registerApp('window-nasa', {
    title: 'Satellite Feed',
    icon: '🚀',
    onOpen: () => {
        fetchSpaceStationData();
        if (!nasaInterval) nasaInterval = setInterval(fetchSpaceStationData, 5000);
    },
    onClose: () => {
        if (nasaInterval) { clearInterval(nasaInterval); nasaInterval = null; }
    }
});