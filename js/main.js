import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MapBorders } from './map-borders.js';
import { CityLabels } from './city-labels.js';
import { GUIControls } from './gui-controls.js';

// --- 场景设置 ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('globe'),
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.z = 15;

// --- 光照 ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(25, 50, 25);
scene.add(pointLight);

// --- 地球 ---
const earthRadius = 5;
const earthGeometry = new THREE.SphereGeometry(earthRadius, 64, 64);
const earthMaterial = new THREE.MeshPhongMaterial({
    map: new THREE.TextureLoader().load('./static/earth.jpg'),
    specularMap: new THREE.TextureLoader().load('./static/earth.jpg'),
});
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);

// --- 初始化模块 ---
const mapBorders = new MapBorders(earth, earthRadius);
const cityLabels = new CityLabels(earth, earthRadius);
const guiControls = new GUIControls();

// --- 参数获取 ---
const params = guiControls.getParams();

// --- 设置GUI回调函数 ---
// 更新相机控制参数的函数
function updateCameraControls() {
    controls.zoomSpeed = params.zoomSpeed;
    controls.minDistance = params.minDistance;
    controls.maxDistance = params.maxDistance;
}

// 注册GUI回调函数
guiControls.registerCallback('updateCircle', updateCircle);
guiControls.registerCallback('toggleBorders', (visible) => mapBorders.toggleBorders(visible));
guiControls.registerCallback('toggleChinaBorders', (visible) => mapBorders.toggleChinaBorders(visible));
guiControls.registerCallback('toggleCities', (visible) => {
    cityLabels.toggleCities(visible);
    if (!visible) {
        cityLabels.toggleCityLabels(false);
    } else {
        cityLabels.toggleCityLabels(params.showCityLabels);
    }
});
guiControls.registerCallback('toggleCityLabels', (visible) => {
    cityLabels.toggleCityLabels(visible, params.showCities);
    // 重新加载城市以应用标签设置
    if (params.showCities) {
        cityLabels.reloadCitiesWithLabels(visible);
    }
});
guiControls.registerCallback('updateCameraControls', updateCameraControls);


// --- 控件 ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1; // 阻尼系数，使旋转更平滑
controls.minDistance = params.minDistance; // 使用GUI参数
controls.maxDistance = params.maxDistance; // 使用GUI参数

// 鼠标滚轮缩放控制
controls.enableZoom = true;
controls.zoomSpeed = params.zoomSpeed; // 使用GUI参数
controls.minZoom = 0.1; // 最小缩放比例
controls.maxZoom = 10; // 最大缩放比例

// 旋转控制
controls.enableRotate = true;
controls.rotateSpeed = 0.5; // 旋转速度

// 平移控制
controls.enablePan = true;
controls.panSpeed = 0.8; // 平移速度

// 可选：自定义滚轮事件处理（更精细的控制）
// 如果默认的 zoomSpeed 还不够精细，可以启用此自定义处理
function setupCustomZoom() {
    let isCustomZoomEnabled = false; // 设置为 true 启用自定义缩放

    if (isCustomZoomEnabled) {
        // 禁用默认的滚轮缩放
        controls.enableZoom = false;

        // 添加自定义滚轮事件
        renderer.domElement.addEventListener('wheel', (event) => {
            event.preventDefault();

            // 获取当前相机距离
            const distance = camera.position.length();

            // 计算缩放因子（根据滚轮方向）
            const zoomFactor = event.deltaY > 0 ? 1.05 : 0.95; // 更小的缩放步长

            // 计算新的距离
            let newDistance = distance * zoomFactor;

            // 限制缩放范围
            newDistance = Math.max(controls.minDistance, Math.min(controls.maxDistance, newDistance));

            // 应用新的相机位置
            camera.position.normalize().multiplyScalar(newDistance);

        }, { passive: false });
    }
}

// 调用自定义缩放设置（默认不启用）
setupCustomZoom();

// --- 在球面上绘制圆的函数 ---
let circleGroup;
function drawCircleOnSphere(lat, lon, radiusKm) {
    if (circleGroup) {
        earth.remove(circleGroup); // 移除旧的圆和圆心
    }

    const earthRadiusKm = 6371; // 地球平均半径
    const angularRadius = radiusKm / earthRadiusKm; // 角度半径

    // 创建圆心位置
    const centerPosition = latLonToVector3(lat, lon, earthRadius);

    // 创建圆心标记
    const centerGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const centerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const centerMesh = new THREE.Mesh(centerGeometry, centerMaterial);
    centerMesh.position.copy(centerPosition);

    // 创建圆圈点
    const points = [];
    const numPoints = 64;

    for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;

        // 在球面上计算圆圈上的点
        const circLat = Math.asin(Math.sin(THREE.MathUtils.degToRad(lat)) * Math.cos(angularRadius) +
            Math.cos(THREE.MathUtils.degToRad(lat)) * Math.sin(angularRadius) * Math.cos(angle));
        const circLon = THREE.MathUtils.degToRad(lon) +
            Math.atan2(Math.sin(angle) * Math.sin(angularRadius) * Math.cos(THREE.MathUtils.degToRad(lat)),
                Math.cos(angularRadius) - Math.sin(THREE.MathUtils.degToRad(lat)) * Math.sin(circLat));

        const circPoint = latLonToVector3(THREE.MathUtils.radToDeg(circLat), THREE.MathUtils.radToDeg(circLon), earthRadius);
        points.push(circPoint);
    }

    // 创建圆圈几何体
    const circleGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const circleMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000,
        linewidth: 3,
        transparent: true,
        opacity: 0.8
    });
    const circleMesh = new THREE.LineLoop(circleGeometry, circleMaterial);

    // 创建带箭头的半径线
    // const radiusLine = createRadiusWithArrow(lat, lon, angularRadius);

    // 创建透明覆盖区域
    const coverageArea = createCoverageArea(lat, lon, angularRadius);

    // 创建组合对象
    circleGroup = new THREE.Group();
    circleGroup.add(coverageArea); // 先添加覆盖区域（在底层）
    circleGroup.add(circleMesh);
    circleGroup.add(centerMesh);
    // circleGroup.add(radiusLine);

    earth.add(circleGroup);
}

// 创建带箭头的半径线
function createRadiusWithArrow(lat, lon, angularRadius) {
    const group = new THREE.Group();

    // 计算半径终点（向东方向）
    const endLat = Math.asin(Math.sin(THREE.MathUtils.degToRad(lat)) * Math.cos(angularRadius) +
        Math.cos(THREE.MathUtils.degToRad(lat)) * Math.sin(angularRadius));
    const endLon = THREE.MathUtils.degToRad(lon) +
        Math.atan2(Math.sin(angularRadius) * Math.cos(THREE.MathUtils.degToRad(lat)),
            Math.cos(angularRadius) - Math.sin(THREE.MathUtils.degToRad(lat)) * Math.sin(endLat));

    // 创建弧线上的点（沿着地球表面）
    const arcPoints = [];
    const numArcPoints = 20; // 弧线分段数

    for (let i = 0; i <= numArcPoints; i++) {
        const t = i / numArcPoints;
        const currentAngularRadius = angularRadius * t;

        const arcLat = Math.asin(Math.sin(THREE.MathUtils.degToRad(lat)) * Math.cos(currentAngularRadius) +
            Math.cos(THREE.MathUtils.degToRad(lat)) * Math.sin(currentAngularRadius));
        const arcLon = THREE.MathUtils.degToRad(lon) +
            Math.atan2(Math.sin(currentAngularRadius) * Math.cos(THREE.MathUtils.degToRad(lat)),
                Math.cos(currentAngularRadius) - Math.sin(THREE.MathUtils.degToRad(lat)) * Math.sin(arcLat));

        const arcPoint = latLonToVector3(THREE.MathUtils.radToDeg(arcLat), THREE.MathUtils.radToDeg(arcLon), earthRadius + 0.005);
        arcPoints.push(arcPoint);
    }

    // 创建弧线
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xffff00, // 黄色半径线
        linewidth: 2,
        transparent: true,
        opacity: 0.9
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    group.add(line);

    // 创建箭头
    const arrowGeometry = new THREE.ConeGeometry(0.02, 0.08, 8);
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);

    // 定位箭头到弧线的终点
    const endPoint = arcPoints[arcPoints.length - 1];
    const secondLastPoint = arcPoints[arcPoints.length - 2];
    arrow.position.copy(endPoint);

    // 让箭头指向弧线的方向
    const direction = new THREE.Vector3().subVectors(endPoint, secondLastPoint).normalize();
    arrow.lookAt(endPoint.clone().add(direction));

    group.add(arrow);

    return group;
}

// 创建透明覆盖区域
function createCoverageArea(lat, lon, angularRadius) {
    // 创建更密集的点来形成覆盖面，确保贴合球面
    const vertices = [];
    const indices = [];

    // 中心点
    const centerPoint = latLonToVector3(lat, lon, earthRadius + 0.003);
    vertices.push(centerPoint.x, centerPoint.y, centerPoint.z);

    // 创建多层同心圆来更好地贴合球面
    const numRings = 96; // 同心圆数量
    const numSegments = 96; // 每圆周分段数

    let vertexIndex = 1; // 从1开始，0是中心点

    for (let ring = 1; ring <= numRings; ring++) {
        const ringAngularRadius = angularRadius * (ring / numRings);

        for (let i = 0; i < numSegments; i++) {
            const angle = (i / numSegments) * Math.PI * 2;

            const circLat = Math.asin(Math.sin(THREE.MathUtils.degToRad(lat)) * Math.cos(ringAngularRadius) +
                Math.cos(THREE.MathUtils.degToRad(lat)) * Math.sin(ringAngularRadius) * Math.cos(angle));
            const circLon = THREE.MathUtils.degToRad(lon) +
                Math.atan2(Math.sin(angle) * Math.sin(ringAngularRadius) * Math.cos(THREE.MathUtils.degToRad(lat)),
                    Math.cos(ringAngularRadius) - Math.sin(THREE.MathUtils.degToRad(lat)) * Math.sin(circLat));

            const point = latLonToVector3(THREE.MathUtils.radToDeg(circLat), THREE.MathUtils.radToDeg(circLon), earthRadius + 0.003);
            vertices.push(point.x, point.y, point.z);
        }
    }

    // 创建三角形索引
    // 连接中心点到第一圈
    for (let i = 0; i < numSegments; i++) {
        const next = (i + 1) % numSegments;
        indices.push(0, i + 1, next + 1);
    }

    // 连接各圈之间
    for (let ring = 0; ring < numRings - 1; ring++) {
        const currentRingStart = 1 + ring * numSegments;
        const nextRingStart = 1 + (ring + 1) * numSegments;

        for (let i = 0; i < numSegments; i++) {
            const next = (i + 1) % numSegments;

            // 每个四边形分成两个三角形
            indices.push(
                currentRingStart + i,
                nextRingStart + i,
                currentRingStart + next
            );
            indices.push(
                currentRingStart + next,
                nextRingStart + i,
                nextRingStart + next
            );
        }
    }

    // 创建几何体
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    // 创建材质
    const material = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false // 避免透明度问题
    });

    const mesh = new THREE.Mesh(geometry, material);

    return mesh;
}

function updateCircle() {
    drawCircleOnSphere(params.lat, params.lon, params.radiusKm);
}

// --- 经纬度转三维坐标 ---
function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
}

// --- 三维坐标转经纬度 ---
function vector3ToLatLon(vector, radius) {
    const phi = Math.acos(vector.y / radius);
    let theta = Math.atan2(vector.z, -vector.x);

    let lat = 90 - (phi * 180) / Math.PI;
    let lon = (theta * 180) / Math.PI - 180;

    if (lon < -180) {
        lon += 360;
    }

    return { lat, lon };
}

// --- 双击事件 ---
window.addEventListener('dblclick', (event) => {
    // 防止与轨道控制器冲突
    event.preventDefault();

    // 获取canvas的边界矩形，确保坐标计算准确
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();

    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // 首先检查是否点击了城市标记
    const cityIntersects = raycaster.intersectObjects(cityLabels.getCityMarkers().children);
    if (cityIntersects.length > 0) {
        const cityMesh = cityIntersects[0].object;
        const cityData = cityMesh.userData;

        // 更新参数到城市位置
        guiControls.updateParams({
            lat: cityData.lat,
            lon: cityData.lon
        });

        updateCircle();

        console.log(`选择城市: ${cityData.cityName}, ${cityData.countryName} (${cityData.lat}°, ${cityData.lon}°)`);
        return;
    }

    // 如果没有点击城市，则检测地球表面
    const intersects = raycaster.intersectObject(earth, false);

    if (intersects.length > 0) {
        const intersectPoint = intersects[0].point;

        // 标准化交点到地球表面
        const normalizedPoint = intersectPoint.clone().normalize().multiplyScalar(earthRadius);
        const { lat, lon } = vector3ToLatLon(normalizedPoint, earthRadius);

        // 限制精度，避免过度精确
        const newLat = Math.round(lat * 100) / 100;
        const newLon = Math.round(lon * 100) / 100;

        // 更新参数
        guiControls.updateParams({
            lat: newLat,
            lon: newLon
        });

        updateCircle();

        console.log(`选择位置: 纬度 ${newLat}°, 经度 ${newLon}°`);
    }
});


// --- 动画循环 ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // 更新文字标签朝向，让文字始终面向相机并保持水平
    cityLabels.updateLabelOrientation(camera);

    renderer.render(scene, camera);
}

// --- 窗口大小调整 ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- 初始调用 ---
animate();
updateCircle();

// 加载地图数据
mapBorders.loadCountryBorders();
mapBorders.loadChinaBorders();

// 先加载字体，然后加载城市
cityLabels.loadFont().then(() => {
    cityLabels.loadCities(params.showCityLabels);
}).catch(() => {
    // 即使字体加载失败，也要加载城市标记
    console.log('字体加载失败，仅显示城市标记');
    cityLabels.loadCities(false);
});