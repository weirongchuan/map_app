import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

// 城市标记和标签管理模块
export class CityLabels {
    constructor(earth, earthRadius) {
        this.earth = earth;
        this.earthRadius = earthRadius;
        this.loadedFont = null;

        // 创建城市图层组
        this.cityMarkers = new THREE.Group();
        this.cityLabels = new THREE.Group();

        // 添加到地球对象
        this.earth.add(this.cityMarkers);
        this.earth.add(this.cityLabels);

        // 初始化字体加载器
        this.fontLoader = new FontLoader();
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

    // 加载字体
    async loadFont() {
        return new Promise((resolve, reject) => {
            this.fontLoader.load(
                'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
                (font) => {
                    this.loadedFont = font;
                    console.log('字体加载完成');
                    resolve(font);
                },
                undefined,
                (error) => {
                    console.error('字体加载失败:', error);
                    reject(error);
                }
            );
        });
    }

    // 加载城市数据
    async loadCities(showCityLabels = false) {
        try {
            const response = await fetch('./static/citys.json');
            const cities = await response.json();

            // 清除现有城市标记和标签
            this.cityMarkers.clear();
            this.cityLabels.clear();

            cities.forEach(city => {
                this.drawCityMarker(city.lat, city.lon, city.city, city.country, showCityLabels);
            });

            console.log(`已加载 ${cities.length} 个城市`);
        } catch (error) {
            console.error('加载城市数据失败:', error);
        }
    }

    // 绘制城市标记
    drawCityMarker(lat, lon, cityName, countryName, showLabels = false) {
        // 创建城市位置
        const cityPosition = this.latLonToVector3(lat, lon, this.earthRadius + 0.05);

        // 创建城市标记 - 使用小球体
        const markerGeometry = new THREE.SphereGeometry(0.03, 8, 8);
        const markerMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00, // 黄色
            transparent: true,
            opacity: 0.9
        });
        const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);
        markerMesh.position.copy(cityPosition);

        // 添加城市信息到userData
        markerMesh.userData = {
            cityName: cityName,
            countryName: countryName,
            lat: lat,
            lon: lon
        };

        this.cityMarkers.add(markerMesh);

        // 创建城市名称标签
        if (showLabels && this.loadedFont) {
            this.createCityLabel(lat, lon, cityName);
        }
    }

    // 创建城市文字标签
    createCityLabel(lat, lon, cityName) {
        if (!this.loadedFont) return;

        try {
            const textGeometry = new TextGeometry(cityName, {
                font: this.loadedFont,
                size: 0.06,
                height: 0.005,
                curveSegments: 8,
                bevelEnabled: false
            });

            // 计算文字几何体的边界框以便居中
            textGeometry.computeBoundingBox();
            const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
            const textHeight = textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y;

            // 居中文字
            textGeometry.translate(-textWidth / 2, -textHeight / 2, 0);

            const textMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.95,
                side: THREE.DoubleSide // 双面显示，确保文字可见
            });

            const textMesh = new THREE.Mesh(textGeometry, textMaterial);

            // 计算标签位置（稍微高于城市标记）
            const labelPosition = this.latLonToVector3(lat, lon, this.earthRadius + 0.12);
            textMesh.position.copy(labelPosition);

            // 存储标签信息，用于动态更新朝向
            textMesh.userData = {
                isLabel: true,
                cityName: cityName
            };

            this.cityLabels.add(textMesh);
        } catch (error) {
            console.error('创建文字标签失败:', error);
        }
    }

    // 更新文字标签朝向相机
    updateLabelOrientation(camera) {
        if (this.cityLabels.children.length > 0) {
            this.cityLabels.children.forEach(label => {
                if (label.userData.isLabel) {
                    // 让文字面向相机
                    label.lookAt(camera.position);

                    // 保持文字水平 - 重置Z轴旋转
                    const euler = new THREE.Euler().setFromQuaternion(label.quaternion);
                    label.setRotationFromEuler(euler);
                }
            });
        }
    }

    // 显示/隐藏城市标记
    toggleCities(visible) {
        this.cityMarkers.visible = visible;
        if (!visible) {
            this.cityLabels.visible = false;
        }
    }

    // 显示/隐藏城市标签
    toggleCityLabels(visible, showCities = true) {
        this.cityLabels.visible = visible && showCities;
    }

    // 重新加载城市以应用标签设置
    async reloadCitiesWithLabels(showCityLabels) {
        if (this.cityMarkers.visible) {
            await this.loadCities(showCityLabels);
        }
    }

    // 获取城市标记组（用于射线检测）
    getCityMarkers() {
        return this.cityMarkers;
    }
}
