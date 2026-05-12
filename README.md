# Kubernetes demo app (assignment scaffold)

Small **Node.js + Express** backend with a **static HTML/CSS/JS** frontend. The UI and `/api/version` show **Version 1** or **Version 2** depending on the Docker image (`APP_VERSION` build arg).

This repo is structured to match the brief: **Pod**, **ReplicaSet**, **Deployment** (rolling update + **liveness / readiness / startup** probes), and **Service** YAML, plus **two image tags** (`v1`, `v2`).

> **Course policy:** Your brief says AI is allowed only for the frontend and not for Docker, Kubernetes YAML, or deployment steps. Treat the `Dockerfile` and `k8s/*.yml` files as **reference material you must understand, verify, and run yourself** when you submit. The **frontend** in `frontend/public/` is suitable to cite as AI-assisted UI work if your instructor asks.

---

## Repository layout

| Path | Purpose |
|------|--------|
| `backend/` | Express API, static file hosting, health routes for probes |
| `frontend/public/` | UI (`index.html`, `styles.css`, `app.js`) |
| `Dockerfile` | Single image; version chosen at **build time** (`APP_VERSION`) |
| `k8s/pod.yml` | Single Pod example |
| `k8s/rs.yml` | ReplicaSet with 3 replicas |
| `k8s/deployment.yml` | Deployment with rolling strategy + three probes |
| `k8s/service.yml` | ClusterIP Service on port 80 → container 8080 |

---

## Application overview

- **Backend:** Express on port `8080` (or `PORT` env).
- **Endpoints:**
  - `GET /` — UI
  - `GET /api/version` — JSON `{ "version": "1" | "2", "service": "k8s-demo-app" }`
  - `GET /api/health` — **liveness** (always 200 when process is up)
  - `GET /api/ready` — **readiness** (503 until ~10 s after process start, then 200)
  - `GET /api/startup` — **startup** (same window as readiness so startup probe has clear behavior)

Warm-up duration is controlled by `STARTUP_OK_AFTER_MS` (default `10000`). Align probe timings in `k8s/deployment.yml` if you change it.

---

## Run locally (no Docker)

```powershell
cd backend
npm install
$env:APP_VERSION = "1"   # or "2"
$env:PORT = "3000"     # use if 8080 is busy
node server.js
```

Open `http://localhost:3000` (or `http://localhost:8080`). You should see **Version 1** or **Version 2** in the hero card.

---

## Docker images (v1 and v2)

From the **repository root** (folder that contains `Dockerfile`):

```powershell
docker build -t k8s-demo-app:v1 --build-arg APP_VERSION=1 .
docker build -t k8s-demo-app:v2 --build-arg APP_VERSION=2 .
```

Sanity check:

```powershell
docker run --rm -p 8080:8080 k8s-demo-app:v1
# browser: http://localhost:8080  → Version 1

docker run --rm -p 8080:8080 k8s-demo-app:v2
# → Version 2 (different accent colours in the UI)
```

### Push to Docker Hub (optional)

Replace `YOURUSER` with your Docker Hub username, then:

```powershell
docker tag k8s-demo-app:v1 YOURUSER/k8s-demo-app:v1
docker tag k8s-demo-app:v2 YOURUSER/k8s-demo-app:v2
docker push YOURUSER/k8s-demo-app:v1
docker push YOURUSER/k8s-demo-app:v2
```

Edit `k8s/*.yml` and set `image: YOURUSER/k8s-demo-app:v1` (and `imagePullPolicy: Always` if you pull from the registry).

### Minikube / kind (local cluster, no registry)

**Minikube (Docker driver)** — build inside Minikube’s Docker so `imagePullPolicy: IfNotPresent` works:

```powershell
minikube start
minikube docker-env | Invoke-Expression
docker build -t k8s-demo-app:v1 --build-arg APP_VERSION=1 .
docker build -t k8s-demo-app:v2 --build-arg APP_VERSION=2 .
```

**kind** — load images into nodes:

```powershell
docker build -t k8s-demo-app:v1 --build-arg APP_VERSION=1 .
docker build -t k8s-demo-app:v2 --build-arg APP_VERSION=2 .
kind load docker-image k8s-demo-app:v1
kind load docker-image k8s-demo-app:v2
```

---

## Kubernetes YAML (what each file is for)

| File | Role |
|------|------|
| `pod.yml` | One-off Pod; good for “Pod basics” screenshots. |
| `rs.yml` | ReplicaSet maintaining **3** Pods (do **not** apply together with Deployment on the same labels unless you intend to migrate — for the assignment, use **either** RS **or** Deployment for the same app name, or use different label keys). |
| `deployment.yml` | Preferred workload: **RollingUpdate** (`maxSurge: 1`, `maxUnavailable: 0`), **startup / readiness / liveness** probes, starts on **`k8s-demo-app:v1`**. |
| `service.yml` | `ClusterIP` port **80** → target port name **`http`** (8080 on the container). |

**Important:** `rs.yml` and `deployment.yml` both select `app=k8s-demo` and `tier=web`. For a clean demo, apply **Deployment + Service** for the rolling-update section. Use `pod.yml` or `rs.yml` in **separate** demo namespaces or delete them before switching, so you do not get overlapping controllers.

All manifests set `metadata.namespace: demo`. Create it once:

```powershell
kubectl create namespace demo
kubectl config set-context --current --namespace=demo
kubectl apply -f k8s/deployment.yml
kubectl apply -f k8s/service.yml
```

To demo `pod.yml` or `rs.yml` separately, **do not** apply them at the same time as `deployment.yml` if they use overlapping labels (`app=k8s-demo` and `tier=web`), or two controllers will fight over the same Pods. Typical flow: apply `pod.yml`, screenshot, `kubectl delete -f k8s/pod.yml`; then optionally `rs.yml`, delete; then `deployment.yml` + `service.yml` for the rolling-update story.

---

## Deploy and expose

### ClusterIP + port-forward (quickest)

```powershell
kubectl apply -f k8s/deployment.yml
kubectl apply -f k8s/service.yml
kubectl rollout status deployment/k8s-demo
kubectl port-forward service/k8s-demo-svc 8080:80
```

Browse `http://localhost:8080`.

### Minikube service URL

```powershell
minikube service k8s-demo-svc --url
```

---

## Rolling update (v1 → v2)

1. Confirm v1:

   ```powershell
   kubectl get pods -l app=k8s-demo,tier=web -o wide
   kubectl describe deployment k8s-demo
   ```

2. Set image to v2:

   ```powershell
   kubectl set image deployment/k8s-demo app=k8s-demo-app:v2
   kubectl rollout status deployment/k8s-demo
   ```

3. Watch transition:

   ```powershell
   kubectl get pods -l app=k8s-demo,tier=web -w
   ```

4. Final state: all Pods on v2, **Revision** increased:

   ```powershell
   kubectl get rs
   kubectl rollout history deployment/k8s-demo
   ```

Screenshots to capture for the PDF: **all v1 Pods**, **mixed generations during rollout**, **all v2 Pods**, plus `kubectl describe deployment k8s-demo` showing the **RollingUpdate** strategy and probes.

---

## PDF documentation (you produce this)

Your brief requires a **PDF** with screenshots of major steps. Suggested outline:

1. Application overview (architecture, version behaviour).
2. Building and tagging **v1** / **v2** images (terminal + browser).
3. Each YAML file: purpose, key fields (replicas, selectors, probes, service ports).
4. Apply commands, `get`/`describe`/`rollout` output.
5. Rolling update narrative (v1 only → updating → v2 only).

Export from Word/Google Docs or Markdown → PDF, then commit to GitHub (use [Git LFS](https://git-lfs.github.com/) if the PDF or video is large).

---

## Screencast checklist

- Show UI **v1** vs **v2** (colours + headline).
- Show `docker images` with both tags.
- Walk through `k8s/` files briefly on screen.
- Live demo: `kubectl apply`, `port-forward` or `minikube service`, then `kubectl set image` and `kubectl get pods -w`.

---

## GitHub submission

1. Create a **public** repository and push this project.
2. Add **PDF** and **video** (or link video in README if hosted on Drive/YouTube — confirm what your instructor allows).
3. Do **not** commit giant `node_modules`; run `npm install` from `backend/` when cloning.

Initialise git from the project root if needed:

```powershell
git init
git add .
git commit -m "Add k8s demo app, manifests, and README"
git branch -M main
git remote add origin https://github.com/YOURUSER/YOURREPO.git
git push -u origin main
```

---

## Licence

Educational scaffold; adapt as required for your course submission.
