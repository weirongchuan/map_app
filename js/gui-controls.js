import GUI from 'lil-gui';

// GUI控制面板模块
export class GUIControls {
    constructor() {
        this.gui = new GUI();
        this.params = {
            lat: 39.9,
            lon: 116.4,
            radiusKm: 2000,
            showBorders: true,
            showChinaBorders: true,
            showCities: true,
            showCityLabels: false,
            // 相机控制参数
            zoomSpeed: 0.1,
            minDistance: 6.5,
            maxDistance: 50,
        };

        this.callbacks = {};
        this.setupGUI();
    }

    // 设置GUI界面
    setupGUI() {
        // 位置控制
        const positionFolder = this.gui.addFolder('Position Control');
        positionFolder.add(this.params, 'lat', -90, 90).name('Latitude').onChange(() => {
            if (this.callbacks.updateCircle) this.callbacks.updateCircle();
        });
        positionFolder.add(this.params, 'lon', -180, 180).name('Longitude').onChange(() => {
            if (this.callbacks.updateCircle) this.callbacks.updateCircle();
        });
        positionFolder.add(this.params, 'radiusKm', 100, 20037.5).name('Radius (km)').onChange(() => {
            if (this.callbacks.updateCircle) this.callbacks.updateCircle();
        });

        // 显示控制
        const displayFolder = this.gui.addFolder('Display Options');
        displayFolder.add(this.params, 'showBorders').name('Show Country Borders').onChange(() => {
            if (this.callbacks.toggleBorders) this.callbacks.toggleBorders(this.params.showBorders);
        });
        displayFolder.add(this.params, 'showChinaBorders').name('Show China Provinces').onChange(() => {
            if (this.callbacks.toggleChinaBorders) this.callbacks.toggleChinaBorders(this.params.showChinaBorders);
        });
        displayFolder.add(this.params, 'showCities').name('Show Cities').onChange(() => {
            if (this.callbacks.toggleCities) this.callbacks.toggleCities(this.params.showCities);
        });
        displayFolder.add(this.params, 'showCityLabels').name('Show City Labels').onChange(() => {
            if (this.callbacks.toggleCityLabels) this.callbacks.toggleCityLabels(this.params.showCityLabels);
        });

        // 相机控制
        const cameraFolder = this.gui.addFolder('Camera Control');
        cameraFolder.add(this.params, 'zoomSpeed', 0.1, 2.0, 0.1).name('Zoom Speed').onChange(() => {
            if (this.callbacks.updateCameraControls) this.callbacks.updateCameraControls();
        });
        cameraFolder.add(this.params, 'minDistance', 3, 15, 0.5).name('Min Distance').onChange(() => {
            if (this.callbacks.updateCameraControls) this.callbacks.updateCameraControls();
        });
        cameraFolder.add(this.params, 'maxDistance', 20, 100, 5).name('Max Distance').onChange(() => {
            if (this.callbacks.updateCameraControls) this.callbacks.updateCameraControls();
        });
    }

    // 注册回调函数
    registerCallback(name, callback) {
        this.callbacks[name] = callback;
    }

    // 更新GUI显示
    updateDisplay() {
        this.gui.controllers.forEach(controller => controller.updateDisplay());
    }

    // 获取参数
    getParams() {
        return this.params;
    }

    // 更新参数
    updateParams(newParams) {
        Object.assign(this.params, newParams);
        this.updateDisplay();
    }

    // 销毁GUI
    destroy() {
        this.gui.destroy();
    }
}
