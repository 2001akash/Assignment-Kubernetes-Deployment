# Short Answers — Practical Scenario Questions

---

## Docker — Practical Scenario Questions

### 1. Docker container works on laptop but fails in CI/CD pipeline

**How would you debug this?**

This is usually an **environment mismatch** between your laptop and the CI runner.

**Step-by-step debugging:**

1. **Compare environments**
   - CI OS vs local OS (Linux runner vs Windows/Mac)
   - Docker version, build context, and base image tag
   - Environment variables available in CI vs locally

2. **Reproduce locally using the same image CI builds**
   ```bash
   docker build -t myapp:ci-test .
   docker run --rm myapp:ci-test
   ```

3. **Inspect CI logs**
   - Build stage: missing files, failed `RUN` steps, wrong `WORKDIR`
   - Run stage: missing env vars, wrong port, permission errors

4. **Check CI-specific issues**
   - Secrets not injected in pipeline (`DATABASE_URL`, API keys)
   - Different network access (CI cannot reach internal DB)
   - File paths case-sensitive on Linux but not Windows
   - `.dockerignore` excluding files needed in CI

5. **Run interactively inside the built image**
   ```bash
   docker run -it --entrypoint /bin/sh myapp:ci-test
   ```

**Fix:** Use one `Dockerfile`, pin base image versions, pass env vars through CI secrets, and test the exact built image before deploy.

---

### 2. Docker image size suddenly increases from 500 MB to 5 GB

**What steps will you take to identify the cause?**

1. **Compare image history**
   ```bash
   docker history myapp:latest --no-trunc
   docker history myapp:old-tag --no-trunc
   ```
   Find which layer grew.

2. **Inspect image contents**
   ```bash
   docker run --rm -it myapp:latest du -sh /*
   ```

3. **Check common causes**
   - Accidentally copied large datasets, model files, or `node_modules/` into build context
   - New `RUN pip install` / `apt-get` without cleanup in same layer
   - Switched from slim/alpine base to full OS image
   - Debug tools, Jupyter, or GPU libraries added unintentionally
   - Build cache invalidated, reinstalling everything in one huge layer

4. **Review `.dockerignore`**
   - Ensure data/, models/, .git/, logs/, and artifacts are excluded

5. **Use multi-stage builds**
   - Keep only runtime artifacts in final image

**Prevention:** Pin dependencies, use slim base images, multi-stage builds, and CI alerts on image size regression.

---

### 3. Application in Docker cannot connect to external database

**How would you troubleshoot it?**

1. **Test connectivity from inside the container**
   ```bash
   docker exec -it <container> sh
   nc -zv db-host 5432
   # or: ping db-host, curl, psql/mysql client
   ```

2. **Verify connection string**
   - Use service hostname/IP reachable from container network
   - On Docker Desktop, `localhost` inside container ≠ host machine — use `host.docker.internal` (Windows/Mac) or host network mode for local DB

3. **Check firewall and security groups**
   - DB must allow inbound from Docker host IP or container subnet

4. **Check DNS**
   - Wrong hostname resolution inside container
   - Try IP directly to isolate DNS issues

5. **Check credentials and TLS**
   - Wrong user/password, SSL required but not configured

6. **Docker network mode**
   - Custom bridge network vs default bridge
   - In Compose, services should use service names (`postgres:5432`)

**Typical fix:** Correct `DATABASE_URL`, open firewall, use proper host alias, and ensure DB listens on `0.0.0.0` not only `127.0.0.1`.

---

### 4. Container exits immediately after starting

**How do you find the root cause?**

| Command | Purpose |
|---------|---------|
| `docker ps -a` | See exit code (non-zero = failure) |
| `docker logs <container>` | Read crash output / traceback |
| `docker inspect <container>` | Check CMD, ENTRYPOINT, env vars, mounts |
| `docker run -it --entrypoint /bin/sh <image>` | Run shell and test start command manually |

**Common causes:**
- Application crashes on startup (missing env var, import error)
- Wrong `CMD` or `ENTRYPOINT`
- Port already in use
- Container runs a one-shot command and exits normally (batch job, not a server)
- Permission denied on mounted volume

**Workflow:** Exit code → logs → inspect config → run interactively.

---

### 5. Deploy ML model with GPU support inside Docker

**What challenges will you face and how will you solve them?**

**Challenges:**
- Host must have NVIDIA GPU + drivers installed
- Container needs **NVIDIA Container Toolkit** (`nvidia-docker2`)
- CUDA/cuDNN versions must match framework (TensorFlow/PyTorch) and driver
- Image size grows significantly with GPU libraries
- CI runners often have no GPU

**Solutions:**

1. **Use NVIDIA base images**
   ```dockerfile
   FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04
   RUN pip install torch torchvision
   ```

2. **Run with GPU access**
   ```bash
   docker run --gpus all -p 8080:8080 model-api:latest
   ```

3. **Pin CUDA and library versions** in `requirements.txt`

4. **Separate CPU and GPU images** — lightweight CPU image for dev/CI, GPU image for training/inference nodes

5. **In Kubernetes** — schedule on GPU nodes with device plugin, resource limits `nvidia.com/gpu: 1`

---

### 6. Docker build taking too long in production pipelines

**How would you optimize it?**

1. **Layer caching** — order Dockerfile: copy `requirements.txt` first, install deps, then copy app code
2. **Use BuildKit** — `DOCKER_BUILDKIT=1` for parallel builds and cache mounts
3. **Multi-stage builds** — smaller final image, faster pushes
4. **`.dockerignore`** — reduce build context size
5. **Pin base images** — avoid re-pulling `latest` every build
6. **Registry cache** — use `--cache-from` in CI
7. **Avoid unnecessary `RUN apt-get update`** in every build
8. **Pre-built dependency images** — internal base image with common packages

**CI tip:** Only rebuild when Dockerfile or dependencies change; use image tagging and layer cache from previous pipeline runs.

---

### 7. Container works locally but fails in Kubernetes — Docker or cluster issue?

**How would you isolate the cause?**

**Test 1 — Is the image itself valid?**
```bash
docker run --rm -e DATABASE_URL=... -p 8080:8080 myapp:tag
```
If this fails → **Docker/image issue** (wrong CMD, missing files, env vars).

**Test 2 — Does the same image work when pulled on a cluster node?**
```bash
kubectl run debug --image=myapp:tag --rm -it -- /bin/sh
```
If Docker works but Pod fails → **Kubernetes config issue**.

**Kubernetes-specific checks:**
- `kubectl describe pod` — Events, probe failures, OOMKilled, ImagePullBackOff
- `kubectl logs pod` — application errors
- Missing ConfigMaps/Secrets vs local `.env`
- Wrong `imagePullPolicy` or registry auth
- Resource limits too low
- Readiness/liveness probe misconfigured (wrong path/port)
- Service networking vs container port mismatch

**Rule:** Same image + same env vars should behave the same. Diff usually means K8s config, not Docker.

---

## Kubernetes — Practical Scenario Questions

### 8. Pod stuck in CrashLoopBackOff

**How would you debug and resolve it?**

**CrashLoopBackOff** means the container starts, crashes, and Kubernetes retries with backoff.

1. **`kubectl describe pod <name>`** — Events, restart count, exit code, probe failures
2. **`kubectl logs <name>`** — current crash output
3. **`kubectl logs <name> --previous`** — logs from last crashed instance (critical for instant crashes)
4. **`kubectl get events --sort-by='.lastTimestamp'`** — cluster events

**Common fixes:**
- Fix application startup error (missing env, DB connection)
- Correct image tag or pull secrets
- Increase memory limits if OOMKilled
- Fix liveness probe (too aggressive, wrong endpoint)
- Mount required ConfigMaps/Secrets/volumes

---

### 9. Application running but not reachable from outside the cluster

**What steps will you take?**

1. **Verify Pods are Running and Ready**
   ```bash
   kubectl get pods -l app=myapp
   kubectl describe pod <pod>
   ```

2. **Check Service**
   ```bash
   kubectl get svc
   kubectl describe svc myapp
   ```
   - `ClusterIP` is internal only — not reachable from internet
   - Need `NodePort`, `LoadBalancer`, or **Ingress**

3. **Test inside cluster first**
   ```bash
   kubectl run curl --rm -it --image=curlimages/curl -- curl http://myapp:8080
   ```
   If this works, app is fine — exposure layer is the problem.

4. **Check Ingress / LoadBalancer**
   - Ingress rules, host/path, TLS
   - LoadBalancer has external IP assigned
   - Security groups / firewall allow traffic

5. **Check `targetPort` vs `containerPort`** and selector labels match Pod labels

**Production fix:** Ingress + LoadBalancer with correct DNS, TLS, and firewall rules.

---

### 10. Service randomly slow under load

**How would you investigate the issue?**

1. **Metrics**
   - `kubectl top pods` / `kubectl top nodes` — CPU/memory pressure
   - Prometheus/Grafana — latency p95/p99, error rate, request rate

2. **Check HPA behavior**
   - Are replicas scaling fast enough?
   - `kubectl describe hpa`

3. **Pod distribution**
   - All traffic on one node? Use pod anti-affinity
   - Noisy neighbor on same node

4. **Application bottlenecks**
   - DB connection pool exhausted
   - Synchronous blocking calls
   - GC pauses (Java/Python)

5. **Network**
   - Cross-AZ latency
   - Service mesh overhead

6. **Probes and limits**
   - CPU throttling due to low limits
   - Readiness flapping removing Pods from load balancer

**Fixes:** HPA on CPU/custom metrics, increase replicas, tune resource requests/limits, connection pooling, caching, and horizontal scaling.

---

### 11. Deployed 3 replicas but only 1 receiving traffic

**What could be wrong?**

1. **Only 1 Pod is Ready** — other Pods failing readiness probe
   ```bash
   kubectl get endpoints myapp
   ```
   Endpoints list shows only healthy Pods receiving traffic.

2. **Label selector mismatch** — Service selector does not match all Pod labels

3. **Session affinity enabled**
   ```yaml
   sessionAffinity: ClientIP
   ```
   Sticky sessions route same client to one Pod (can look like uneven load).

4. **Pods on NotReady nodes** — scheduler placed Pods but they never become Ready

5. **Load test from single client** — with session affinity, one Pod gets all requests

6. **Headless Service or wrong port** — traffic not distributed as expected

**Fix:** Ensure all 3 Pods pass readiness probes, verify endpoints, disable session affinity if not needed, check Service `selector` and `ports`.

---

### 12. Cluster running out of CPU/memory

**How do you identify and fix the issue?**

**Identify:**
```bash
kubectl top nodes
kubectl top pods --all-namespaces --sort-by=cpu
kubectl describe nodes   # Conditions, Allocated resources
kubectl get pods --all-namespaces -o wide | grep Pending
```

**Causes:**
- No resource requests/limits — Pods overcommit nodes
- Too many workloads, no capacity planning
- Memory leaks in applications
- DaemonSets consuming node resources

**Fixes:**
1. Set **requests and limits** on all workloads
2. **Scale cluster** — add nodes (Cluster Autoscaler)
3. **Right-size** over-provisioned Pods
4. **Delete** unused Deployments/namespaces
5. **Use quotas** per namespace (`ResourceQuota`)
6. **Evict** low-priority workloads; use PriorityClasses

---

### 13. Pod keeps getting terminated due to OOMKilled

**How would you resolve it?**

**OOMKilled** = container exceeded its memory limit and was killed by the kernel.

1. **Confirm**
   ```bash
   kubectl describe pod <name>   # Last State: Terminated, Reason: OOMKilled
   ```

2. **Increase memory limit** (and request)
   ```yaml
   resources:
     limits:
       memory: 2Gi
     requests:
       memory: 1Gi
   ```

3. **Profile the application** — memory leak, loading full dataset into RAM, large ML model

4. **Optimize app** — batch processing, streaming, model quantization, garbage collection tuning

5. **Check node memory** — node itself under pressure causes evictions

6. **Use VPA** (Vertical Pod Autoscaler) for recommendation-based sizing

**Do not** set limits without requests; always monitor memory usage after changes.

---

### 14. Deployment update caused downtime

**How would you design the rollout to avoid this in the future?**

Use **RollingUpdate** with safe parameters:

```yaml
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
```

**Additional practices:**
- **Readiness probes** — new Pods only receive traffic when healthy
- **PreStop hook** — graceful shutdown, drain connections
- **`minReadySeconds`** — wait before marking Pod available
- **PodDisruptionBudget** — `minAvailable: 2` during updates
- **Blue/green or canary** — Argo Rollouts, Flagger for gradual traffic shift
- **Test in staging** with same manifest

**Rollback ready:** `kubectl rollout undo deployment/myapp`

---

### 15. ML workload requiring GPUs in Kubernetes

**How would you configure Kubernetes for it?**

1. **GPU nodes** — pool of nodes with NVIDIA GPUs

2. **Install NVIDIA device plugin** on GPU nodes
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.0/nvidia-device-plugin.yml
   ```

3. **Taint GPU nodes** (optional) — keep general workloads off GPU nodes
   ```bash
   kubectl taint nodes gpu-node-1 nvidia.com/gpu=true:NoSchedule
   ```

4. **Pod spec — request GPU**
   ```yaml
   resources:
     limits:
       nvidia.com/gpu: 1
   tolerations:
   - key: nvidia.com/gpu
     operator: Equal
     value: "true"
     effect: NoSchedule
   ```

5. **Use GPU-enabled container image** with matching CUDA version

6. **Schedule training as Jobs** — batch GPU work; inference on Deployment with HPA on CPU if model allows

---

## MLflow — Practical Scenario Questions

### 16. Cannot reproduce the same accuracy later

**How would MLflow help you debug this?**

MLflow records everything needed to reproduce a run:

| What changed? | Where to look in MLflow |
|-------------|-------------------------|
| Hyperparameters | Run → Parameters |
| Training data version | Tags, logged artifacts, `mlflow.log_input()` |
| Code version | Git commit tag on run |
| Environment | `conda.yaml` / `requirements.txt` in artifacts |
| Random seed | Logged param or missing (add it!) |
| Metrics | Compare original run vs new attempt |

**Debug workflow:**
1. Find the original high-accuracy run in MLflow UI
2. Compare parameters, data hash, and environment with your new run
3. Reload model: `mlflow.sklearn.load_model(runs:/<run_id>/model)`
4. Re-run training with `mlflow.projects` or copy exact params from the UI

**Common cause:** Different train/test split, data leakage, or unlogged random seed.

---

### 17. Multiple team members — results getting mixed up

**How would you organize this using MLflow?**

1. **One Tracking Server** — shared URI for all scientists
   ```python
   mlflow.set_tracking_uri("http://mlflow-server:5000")
   ```

2. **Experiments per project** — not per person
   ```python
   mlflow.set_experiment("fraud-detection")
   ```

3. **Tags for ownership**
   ```python
   mlflow.set_tag("developer", "alice")
   mlflow.set_tag("team", "ml-platform")
   ```

4. **Naming convention for runs** — `rf-baseline-alice-2024-01-15`

5. **Never share one run** — each training session gets unique Run ID

6. **Model Registry** for approved models only — experiments stay in Tracking

**Result:** All runs in one searchable place; no overwrites; full team visibility.

---

### 18. Good in training, poor in production

**How would you investigate using MLflow logs?**

1. **Compare training vs production metrics** — training accuracy vs live precision/recall (log production metrics back to MLflow)

2. **Review training run artifacts** — confusion matrix, feature importance, data sample

3. **Check data drift** — training data distribution vs current production inputs

4. **Verify correct model version deployed** — Registry Production stage matches intended run ID

5. **Compare Staging vs Production** — was validation data representative?

6. **Inspect preprocessing** — same pipeline in training and serving?

7. **Rollback candidate** — promote previous Registry version if it performed better on recent data

---

### 19. MLflow experiment logs incomplete

**What could be the reasons and how will you fix them?**

**Reasons:**
- `log_param` / `log_metric` calls missing or inside failed try block
- Run ended before logging completed (crash, killed job)
- Wrong experiment ID or tracking URI (logging to wrong server)
- Network failure to remote tracking server
- Disk full on artifact store
- Autolog not enabled for framework

**Fixes:**
1. Wrap training in `with mlflow.start_run():` and log inside
2. Use `mlflow.autolog()` for sklearn/xgboost/pytorch
3. Log at end: params, metrics, model, artifacts explicitly
4. Verify `mlflow.get_tracking_uri()` points to correct server
5. Check server logs and artifact store permissions
6. Add `try/finally` to ensure `log_model` runs

---

### 20. Compare 50 different experiments efficiently

**How would you do this in MLflow?**

**UI:**
1. Open experiment → filter by metrics/tags
2. Sort by `accuracy` or `f1_score`
3. Select top runs → **Compare** view (parallel coordinates, scatter plots)

**Code:**
```python
import mlflow
runs = mlflow.search_runs(
    experiment_ids=["1"],
    order_by=["metrics.f1_score DESC"],
    max_results=50
)
print(runs[["run_id", "params.model", "metrics.accuracy", "metrics.f1_score"]])
```

**Tips:** Use consistent param names, tag runs with `model_type`, export to CSV for custom charts, use MLflow UI metric filters to narrow 50 → top 10 quickly.

---

### 21. Model ready for production — use MLflow Model Registry

**How would you manage it?**

1. **Register** after validation
   ```python
   mlflow.register_model("runs:/<run_id>/model", "fraud-detector")
   ```

2. **Transition stages**
   - None → Staging (QA testing)
   - Staging → Production (approved for live traffic)
   - Production → Archived (retired)

3. **Add description and tags** — owner, approval date, data version

4. **Load in production**
   ```python
   model = mlflow.pyfunc.load_model("models:/fraud-detector/Production")
   ```

5. **CI/CD trigger** on Production transition — auto-build Docker image and deploy to Kubernetes

**Benefits:** Version history, audit trail, no ad-hoc `model_final.pkl` files.

---

### 22. MLflow artifacts taking too much storage

**How would you optimize storage usage?**

1. **Remote artifact store with lifecycle rules** — S3/GCS with expiration for old experiment artifacts

2. **Do not log huge raw datasets** — log hashes, sample paths, or DVC references

3. **Log only best models** — register top run to Registry; prune failed runs

4. **Artifact cleanup**
   ```bash
   mlflow gc --backend-store-uri sqlite:///mlflow.db --artifacts-destination s3://bucket/
   ```

5. **Compress artifacts** — smaller plots, avoid duplicate files per run

6. **Separate stores** — PostgreSQL for metadata (small), S3 for artifacts with tiered storage

7. **Retention policy** — archive experiments older than N months

---

### 23. Integrate MLflow with Kubernetes for automated model deployment

**How would you do it?**

**Architecture:**
```
Training Job (K8s) → MLflow Tracking → Model Registry → CI/CD → K8s Deployment
```

**Steps:**

1. **MLflow server on Kubernetes** — Deployment + PostgreSQL + S3 artifact store

2. **Training as Kubernetes Job** — logs to shared MLflow server

3. **Registry webhook / CI trigger** — on Production promotion:
   ```bash
   mlflow models build-docker -m models:/my-model/Production -n my-api
   docker build -t registry.io/my-api:$VERSION .
   docker push registry.io/my-api:$VERSION
   kubectl set image deployment/my-api app=registry.io/my-api:$VERSION
   ```

4. **Serving Deployment** — pulls model at startup or bakes into image

5. **HPA + monitoring** — scale inference Pods; log production metrics back to MLflow

**Tools:** ArgoCD, GitHub Actions, Helm, External Secrets for MLflow credentials.

---

## Combined System Design Scenarios

### 24. Build end-to-end ML system with Docker, Kubernetes, and MLflow

**How would you combine them?**

| Layer | Tool | Role |
|-------|------|------|
| Training | MLflow Tracking | Log params, metrics, models for every experiment |
| Packaging | Docker | Consistent training and serving environments |
| Orchestration | Kubernetes | Run training Jobs, serve models, scale inference |
| Governance | MLflow Registry | Version and approve models for production |
| Delivery | CI/CD | Auto-deploy on Registry promotion |
| Operations | Prometheus/Grafana | Monitor latency, CPU, model drift |

**Flow:** Data scientist trains → MLflow logs run → best model registered → CI builds Docker image → Kubernetes Deployment with HPA serves predictions → monitoring triggers retrain if drift detected.

---

### 25. Model works in MLflow but fails after Dockerization

**How would you debug the pipeline?**

1. **Load model locally outside Docker** — confirm Registry artifact is valid
   ```python
   model = mlflow.pyfunc.load_model("models:/my-model/Production")
   ```

2. **Test inside Docker interactively**
   ```bash
   docker run -it my-api:tag python -c "import mlflow; m=mlflow.pyfunc.load_model('...'); print(m.predict(...))"
   ```

3. **Check common breaks**
   - Missing Python dependencies in image (`requirements.txt` incomplete)
   - Wrong MLflow/model flavor (sklearn vs pyfunc)
   - Model path wrong at runtime (env var `MODEL_URI`)
   - Different Python version in container
   - Missing system libraries (libgomp, etc.)
   - Input schema mismatch (wrong feature columns/order)

4. **Compare environments** — `conda.yaml` from MLflow artifact vs Dockerfile

**Fix:** Use `mlflow models build-docker` or match `requirements.txt` to training environment exactly.

---

### 26. System supporting retraining, versioning, and auto-deployment

**How would you design it?**

1. **Scheduled or event-driven retraining** — new data in S3 → Airflow/K8s CronJob triggers training script

2. **MLflow tracks every retrain** — compare new run vs current Production metrics

3. **Auto-register if metrics improve** — pipeline promotes to Staging, runs validation tests

4. **Human or automated gate** — transition to Production in Registry

5. **CI/CD deploys new Docker image** — rolling update on Kubernetes

6. **Version everything** — data version, code commit, model version, container tag linked in MLflow tags

```
New Data → Train (MLflow) → Evaluate → Register → Promote → Build Image → K8s Rollout
```

---

### 27. Reproducibility from training (MLflow) to deployment (Docker + Kubernetes)

**How do you ensure it?**

| Stage | Reproducibility measure |
|-------|-------------------------|
| Training | MLflow logs params, metrics, git commit, data hash, `requirements.txt` |
| Model | Registry immutable versions linked to Run ID |
| Container | Dockerfile pins base image and dependency versions |
| Deploy | Kubernetes manifest pins image digest, not `latest` |
| Config | ConfigMaps/Secrets versioned in Git |

**End-to-end trace:** Production Pod image tag → CI build → Registry model v3 → Run ID `abc123` → exact hyperparameters and training data.

**Practice:** Never deploy `latest`; use `image: my-api@sha256:...` or immutable version tags.

---

### 28. Handle sudden traffic spikes while serving ML predictions

**How would you design it?**

1. **Stateless inference API** in Docker — model loaded at startup or from cache

2. **Kubernetes Deployment** with multiple replicas across nodes

3. **HPA** on CPU and/or custom metric (requests/sec, queue depth)
   ```yaml
   minReplicas: 3
   maxReplicas: 100
   ```

4. **LoadBalancer/Ingress** distributes traffic

5. **Readiness probes** — only route to Pods that finished loading model

6. **Cluster Autoscaler** — add nodes when Pods cannot schedule

7. **Optional:** model server (TorchServe, Triton) with dynamic batching

8. **Caching** — cache frequent predictions in Redis

9. **Async queue** — for non-real-time spikes (Kafka + workers)

---

### 29. Rollback if newly deployed ML model performs poorly

**How would you implement rollback?**

**MLflow Registry rollback:**
```python
client = MlflowClient()
# Re-promote previous version to Production
client.transition_model_version_stage("fraud-detector", previous_version, "Production")
```

**Kubernetes rollback:**
```bash
kubectl rollout undo deployment/fraud-api
# or deploy previous image tag
kubectl set image deployment/fraud-api app=registry.io/fraud-api:v2-previous
```

**Fast combined rollback (< 5 min):**
1. Detect degradation via monitoring (accuracy drop, latency spike, error rate)
2. Revert Registry to previous Production version
3. CI/CD redeploys previous Docker image OR `kubectl rollout undo`
4. Verify traffic on old model; archive bad version

**Prevention:** Canary deployments — route 5% traffic to new model before full rollout.
