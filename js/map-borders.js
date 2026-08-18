import * as THREE from 'three';

// 地图边界绘制模块
export class MapBorders {
    constructor(earth, earthRadius) {
        this.earth = earth;
        this.earthRadius = earthRadius;

        // 创建边界图层组
        this.borderLines = new THREE.Group();
        this.chinaBorders = new THREE.Group();

        // 添加到地球对象
        this.earth.add(this.borderLines);
        this.earth.add(this.chinaBorders);
    }

    // 经纬度转三维坐标
    latLonToVector3(lat, lon, radius) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        return new THREE.Vector3(x, y, z);
    }

    // 加载国家边界数据
    async loadCountryBorders() {
        try {
            const response = await fetch('./static/world.zh.json');
            const geoData = await response.json();

            // 清除现有边界
            this.borderLines.clear();

            // 遍历每个国家的边界
            geoData.features.forEach(feature => {
                if (feature.geometry.type === 'Polygon') {
                    this.drawCountryBorder(feature.geometry.coordinates[0]);
                } else if (feature.geometry.type === 'MultiPolygon') {
                    feature.geometry.coordinates.forEach(polygon => {
                        this.drawCountryBorder(polygon[0]);
                    });
                }
            });

            console.log('国家边界加载完成');
        } catch (error) {
            console.error('加载国家边界数据失败:', error);
            this.loadAlternativeBorders();
        }
    }

    // 加载中国省级边界数据
    async loadChinaBorders() {
        try {
            const response = await fetch('./static/china.json');
            const chinaData = await response.json();

            // 清除现有中国边界
            this.chinaBorders.clear();

            // 遍历每个省份的边界
            chinaData.features.forEach(feature => {
                if (feature.geometry.type === 'Polygon') {
                    this.drawChinaBorder(feature.geometry.coordinates[0], feature.properties.name);
                } else if (feature.geometry.type === 'MultiPolygon') {
                    feature.geometry.coordinates.forEach(polygon => {
                        this.drawChinaBorder(polygon[0], feature.properties.name);
                    });
                }
            });

            console.log('中国省级边界加载完成');
        } catch (error) {
            console.error('加载中国省级边界数据失败:', error);
            this.loadAlternativeChinaBorders();
        }
    }

    // 备用中国边界数据
    async loadAlternativeChinaBorders() {
        try {
            const response = await fetch('https://raw.githubusercontent.com/JamesPan/hexo-blog/master/source/china.geojson');
            const chinaData = await response.json();

            this.chinaBorders.clear();

            chinaData.features.forEach(feature => {
                if (feature.geometry.type === 'Polygon') {
                    this.drawChinaBorder(feature.geometry.coordinates[0], feature.properties.name || '未知省份');
                } else if (feature.geometry.type === 'MultiPolygon') {
                    feature.geometry.coordinates.forEach(polygon => {
                        this.drawChinaBorder(polygon[0], feature.properties.name || '未知省份');
                    });
                }
            });

            console.log('中国省级边界（备用数据源）加载完成');
        } catch (error) {
            console.error('备用中国数据源也加载失败:', error);
        }
    }

    // 备用边界数据加载函数
    async loadAlternativeBorders() {
        try {
            const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
            const world = await response.json();
            console.log('使用备用数据源');
        } catch (error) {
            console.error('备用数据源也加载失败:', error);
            this.createSimpleGrid();
        }
    }

    // 创建简单的经纬度网格线作为示例
    createSimpleGrid() {
        const gridMaterial = new THREE.LineBasicMaterial({
            color: 0x666666,
            transparent: true,
            opacity: 0.3
        });

        // 经线
        for (let lon = -180; lon <= 180; lon += 30) {
            const points = [];
            for (let lat = -90; lat <= 90; lat += 5) {
                const point = this.latLonToVector3(lat, lon, this.earthRadius + 0.01);
                points.push(point);
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, gridMaterial);
            this.borderLines.add(line);
        }

        // 纬线
        for (let lat = -90; lat <= 90; lat += 30) {
            const points = [];
            for (let lon = -180; lon <= 180; lon += 5) {
                const point = this.latLonToVector3(lat, lon, this.earthRadius + 0.01);
                points.push(point);
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, gridMaterial);
            this.borderLines.add(line);
        }
    }

    // 绘制单个国家边界
    drawCountryBorder(coordinates) {
        const points = [];

        coordinates.forEach(coord => {
            const [lon, lat] = coord;
            if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                const point = this.latLonToVector3(lat, lon, this.earthRadius + 0.01);
                points.push(point);
            }
        });

        if (points.length > 1) {
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.6,
                linewidth: 1
            });
            const line = new THREE.LineLoop(geometry, material);
            this.borderLines.add(line);
        }
    }

    // 绘制中国省级边界
    drawChinaBorder(coordinates, provinceName) {
        const points = [];

        coordinates.forEach(coord => {
            const [lon, lat] = coord;
            if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                const point = this.latLonToVector3(lat, lon, this.earthRadius + 0.02);
                points.push(point);
            }
        });

        if (points.length > 1) {
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: 0xff6600,
                transparent: true,
                opacity: 0.8,
                linewidth: 2
            });
            const line = new THREE.LineLoop(geometry, material);
            line.userData = { provinceName: provinceName };
            this.chinaBorders.add(line);
        }
    }

    // 显示/隐藏国家边界
    toggleBorders(visible) {
        this.borderLines.visible = visible;
    }

    // 显示/隐藏中国边界
    toggleChinaBorders(visible) {
        this.chinaBorders.visible = visible;
    }
}
