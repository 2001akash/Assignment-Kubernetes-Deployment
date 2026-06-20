# Scenario-Based Questions — Answers

---

## Docker Scenarios (1–10)

### 1. App works on laptop but fails on QA due to different Python package versions

**What problem is causing this?**

This is an **environment inconsistency** problem, commonly called *it works on my machine.* Your laptop and the QA server have different:
- Python versions (e.g., 3.10 vs 3.8)
- Installed package versions (e.g., `pandas 2.0` vs `pandas 1.5`)
- System libraries and OS-level dependencies
- Environment variables and file paths

When you install packages manually on each machine, small differences accumulate and cause import errors, runtime crashes, or silent behavioral changes in QA even though everything worked locally.

**How would Docker solve it?**

Docker packages your application **together with its entire runtime environment** into a single **image**:
1. Define a `Dockerfile` with a specific Python base image (e.g., `python:3.10-slim`)
2. Install exact package versions via `requirements.txt` during image build
3. Build once: `docker build -t myapp:1.0 .`
4. Run the **same image** on laptop, QA, and production

Because the image is immutable, every environment runs identical code with identical dependencies. You eliminate dependency drift and guarantee reproducible behavior everywhere.

---

### 2. Node.js app + PostgreSQL + Redis — run all three together

**How would you run all three services together?**

Create a `docker-compose.yml` that defines three services:

```yaml
services:
  app:
    build: .
    ports: [3000:3000]
    depends_on: [postgres, redis]
    environment:
      DATABASE_URL: postgres://user:pass@postgres:5432/mydb
      REDIS_URL: redis://redis:6379

  postgres:
    image: postgres:15
    volumes: [pgdata:/var/lib/postgresql/data]
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass

  redis:
    image: redis:7

volumes:
  pgdata:
```

Run with `docker-compose up -d`. All three containers share a network, resolve each other by service name, and start in the correct order.

**Which Docker tool would you use?**

**Docker Compose** — it is designed specifically for defining and running multi-container applications with a single command.

---

### 3. Docker image is 4 GB — reduce size

**What techniques would you use?**

1. **Use a smaller base image** — Replace `ubuntu:22.04` (77+ MB) with `python:3.10-slim` (~45 MB) or `alpine` (~5 MB). Avoid full OS images unless you need them.

2. **Multi-stage builds** — Use one stage to compile/install dependencies and a second minimal stage that copies only the final artifacts:
   ```dockerfile
   FROM python:3.10 AS builder
   RUN pip install --user -r requirements.txt
   FROM python:3.10-slim
   COPY --from=builder /root/.local /root/.local
   ```

3. **Combine RUN commands** — Each `RUN` creates a layer. Chain commands: `RUN apt-get update && apt-get install -y pkg && rm -rf /var/lib/apt/lists/*`

4. **Use `.dockerignore`** — Exclude `node_modules/`, `.git/`, test files, and docs from the build context so they are not copied into the image.

5. **Clean up in the same layer** — Delete package caches and build tools in the same `RUN` command that installs them, so they are not stored in a previous layer.

6. **Copy only what you need** — Use specific `COPY src/ ./src/` instead of `COPY . .`

A well-optimized image can go from 4 GB to under 200 MB, making pulls and deployments much faster.

---

### 4. Container crashes every time it starts

**Which Docker commands would you use to troubleshoot?**

| Command | Purpose |
|---------|---------|
| `docker ps -a` | List all containers including stopped ones; check **Exit Code** (0 = success, non-zero = error) |
| `docker logs <container_id>` | View stdout/stderr output — usually shows the crash reason (missing env var, port conflict, import error) |
| `docker logs <container_id> --tail 100` | View only the last 100 lines for large logs |
| `docker inspect <container_id>` | Get full JSON config: env vars, mounts, network, restart policy, exit code |
| `docker run -it --entrypoint /bin/sh <image>` | Start the image interactively with a shell to manually test commands |
| `docker events` | Watch real-time Docker events (create, start, die, destroy) |

**Typical workflow:** Check exit code → read logs → inspect config → run interactively to reproduce the failure.

---

### 5. Application data must remain available even if the container is deleted

**How would you design the solution?**

Use **Docker volumes** for all persistent data:

1. Create a named volume: `docker volume create app-data`
2. Mount it in your container: `docker run -v app-data:/app/data myapp`
3. In Docker Compose, declare volumes at the bottom and reference them in services

**Why volumes?**
- Data lives **outside** the container filesystem
- Survives container stop, restart, and deletion
- Can be backed up with `docker run --rm -v app-data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz /data`
- Multiple containers can share the same volume if needed

**Never** store databases, uploads, or user files only inside the container's writable layer — that data is lost when the container is removed.

---

### 6. Dev / Testing / Production — how Docker maintains consistency

**How would Docker help maintain consistency?**

The key principle is: **build once, deploy everywhere.**

1. CI/CD builds a single Docker image tagged with a version (e.g., `myapp:1.2.3`)
2. The **same image** is promoted to Dev → Testing → Production
3. Only **environment-specific configuration** changes between environments:
   - Environment variables (`DATABASE_URL`, `LOG_LEVEL`)
   - Secrets (API keys, passwords)
   - Resource limits (CPU, memory)
   - Replica count

The application code, Python/Node version, and all dependencies are **identical** in every environment. This eliminates the classic works in dev, breaks in prod problem caused by different server setups.

---

### 7. App needs to communicate with a database container

**How would Docker networking help?**

1. Create a **user-defined bridge network**: `docker network create app-net`
2. Connect both containers to it: `docker run --network app-net --name postgres ...` and `docker run --network app-net --name myapp ...`
3. The app connects to `postgres:5432` (hostname = container name)

**How it works:**
- Docker provides an **internal DNS** on user-defined networks
- Containers resolve each other by name automatically
- Traffic stays isolated from other networks
- In Docker Compose, all services on the same compose file share a network by default

This is far better than hardcoding IP addresses, which change every time a container restarts.

---

### 8. Multiple developers joining — reduce onboarding time

**How would Docker reduce onboarding time?**

Without Docker, a new developer must manually install Python, Node.js, PostgreSQL, Redis, configure databases, set env vars, and debug version conflicts — often taking **hours or days**.

With Docker:
1. Clone the repository
2. Run `docker-compose up`
3. The entire stack starts in minutes with zero manual setup

**Benefits:**
- No works on my machine disputes between team members
- Documented, version-controlled environment in `Dockerfile` and `docker-compose.yml`
- New developers contribute on day one instead of spending days on setup
- Onboarding documentation is simply: install Docker, clone repo, run compose

---

### 9. Identical deployments on AWS, Azure, and local machines

**Why would Docker be useful?**

Each cloud provider and local machine has different:
- Operating systems and kernel versions
- Package managers and installed libraries
- File system layouts and paths

Docker **abstracts away the underlying infrastructure**. A container image runs identically on:
- Your local laptop (Linux/Mac/Windows with Docker Desktop)
- AWS ECS/EKS
- Azure Container Instances/AKS
- Google Cloud Run/GKE

You build the image once, push to a registry (Docker Hub, ECR, ACR), and pull the same image on any platform. This gives you **true portability** and eliminates environment-specific bugs.

---

### 10. Accidentally deleted a running container — what happens to data?

**What happens to the data?**

- **Data stored inside the container filesystem** (without volumes): **permanently lost**
- **Data in Docker volumes**: **safe** — volumes exist independently of containers
- **Data in bind mounts** (mapped host directories): **safe** — files remain on the host

**How could you have prevented data loss?**

1. Always use **named volumes** or **bind mounts** for databases, file uploads, logs, and any persistent data
2. Never rely on the container's writable layer for important data
3. Set up regular **volume backups**
4. Use `docker-compose.yml` with declared volumes so persistence is automatic
5. Consider database containers with volume mounts like: `volumes: [pgdata:/var/lib/postgresql/data]`

---

## Kubernetes Scenarios (11–25)

### 11. Traffic grows from 100 to 10,000 users

**Why is Docker alone insufficient?**

Docker on a single host has these limitations:
- **No auto-scaling** — you cannot automatically add more containers when load increases
- **No load balancing** — Docker does not distribute traffic across multiple container instances
- **No self-healing** — if a container crashes, Docker restarts it on the same host, but cannot move workloads to healthy machines
- **Single host bottleneck** — one machine has finite CPU, memory, and network capacity
- **No rolling updates** — updating containers without downtime requires manual orchestration
- **No multi-node scheduling** — cannot spread workloads across a cluster of machines

**How would Kubernetes help?**

- **Horizontal scaling** — HPA automatically adds/removes Pod replicas based on CPU or custom metrics
- **Load balancing** — Services distribute traffic across all healthy Pod replicas
- **Self-healing** — crashed Pods are automatically recreated; unhealthy nodes are detected and workloads rescheduled
- **Multi-node cluster** — workloads spread across many machines for capacity and fault tolerance
- **Rolling updates** — deploy new versions with zero downtime
- **Resource management** — CPU/memory limits prevent any single app from consuming all node resources

---

### 12. One node in your cluster suddenly crashes

**What happens to the running Pods?**

- All Pods on the crashed node become **unreachable**
- The node's status changes to **NotReady** after the control plane detects missed heartbeats (default ~40 seconds)
- The Service stops routing traffic to Pods on the failed node
- Any in-flight requests to those Pods fail (unless the client retries)

**How does Kubernetes recover?**

1. The **node controller** marks the node as NotReady
2. After a timeout (default 5 minutes), Pods on the dead node are **evicted**
3. The **Deployment/ReplicaSet controller** detects fewer running Pods than desired replicas
4. The **Scheduler** creates replacement Pods on **healthy nodes**
5. New Pods start, pass readiness probes, and begin receiving traffic
6. The cluster returns to the desired state automatically — no manual intervention needed

For stateful workloads, use **PodDisruptionBudgets** and **StatefulSets** with persistent storage to handle node failures gracefully.

---

### 13. Web application needs 5 replicas running at all times

**Which Kubernetes resource would you use?**

Use a **Deployment** with `replicas: 5`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 5
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: myapp:1.0
        ports:
        - containerPort: 8080
```

**Why Deployment?**
- Manages a **ReplicaSet** that continuously ensures exactly 5 Pods are running
- If a Pod crashes or is deleted, a replacement is created automatically
- Supports rolling updates, rollbacks, and scaling (`kubectl scale deployment web-app --replicas=10`)
- Preferred over bare ReplicaSet because it adds rollout management

---

### 14. CPU usage spikes during office hours — auto-scale

**How would you automatically scale the application?**

Use the **Horizontal Pod Autoscaler (HPA)**:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

**How it works:**
1. **Metrics Server** collects CPU usage from each Pod
2. HPA calculates desired replicas: if average CPU > 70%, scale up; if below, scale down
3. During office hours, CPU spikes → HPA adds more Pods automatically
4. After hours, CPU drops → HPA scales down to save resources

**Optional:** Add **Cluster Autoscaler** to provision new nodes when Pods cannot be scheduled due to insufficient cluster capacity.

---

### 15. Application accessible from the internet

**Would you use ClusterIP, NodePort, or LoadBalancer? Why?**

| Type | Internet Access? | Best For |
|------|-----------------|----------|
| **ClusterIP** | No — internal only | Backend services, databases |
| **NodePort** | Partial — exposes on every node's IP at port 30000–32767 | Development/testing only |
| **LoadBalancer** | Yes — provisions cloud LB with public IP | Production internet-facing apps |

**Recommended answer: LoadBalancer** (in cloud) or **Ingress** (production best practice).

**Why not ClusterIP?** It is only reachable inside the cluster. External users cannot connect.

**Why not NodePort alone?** It works but exposes a high port on every node, has no SSL termination, no path-based routing, and is not suitable for production at scale.

**Best production setup:** Use **Ingress** with an Ingress Controller (NGINX, Traefik) behind a LoadBalancer. Ingress provides SSL/TLS, path-based routing, host-based routing, and rate limiting — all from a single entry point.

---

### 16. Database Pod restarts and loses all data

**What Kubernetes storage concepts should have been used?**

**PersistentVolume (PV)** and **PersistentVolumeClaim (PVC)**:

```yaml
# PVC — request storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db-pvc
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 10Gi

# Pod/Deployment — mount the PVC
volumes:
- name: db-storage
  persistentVolumeClaim:
    claimName: db-pvc
```

**Why this matters:**
- Pod filesystem is **ephemeral** — data is lost on restart
- PV provides **durable cluster storage** that survives Pod deletion
- PVC is the application's **request** for storage
- For databases, also use **StatefulSet** (not Deployment) for stable Pod identity and ordered startup

**Additional best practices:** Use storage classes for dynamic provisioning, take regular snapshots, and test backup/restore procedures.

---

### 17. Security team wants database passwords removed from YAML files

**How would Kubernetes handle this?**

Use **Kubernetes Secrets**:

```yaml
# Create secret (never commit this file to git)
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
data:
  password: <base64-encoded-password>

# Reference in Pod/Deployment
env:
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: db-credentials
      key: password
```

**Additional security measures:**
- **RBAC** — restrict who can read Secrets
- **Encryption at rest** — enable etcd encryption for Secrets
- **External secret managers** — HashiCorp Vault, AWS Secrets Manager, Azure Key Vault integrated via operators (External Secrets Operator)
- **Sealed Secrets** or **SOPS** — encrypt Secrets before committing to Git
- Never store plaintext passwords in ConfigMaps or YAML files in version control

---

### 18. Logging agent running on every node

**Which Kubernetes resource is most appropriate?**

**DaemonSet** — ensures exactly one Pod copy runs on every node (or selected nodes):

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd-logging
spec:
  selector:
    matchLabels:
      app: fluentd
  template:
    metadata:
      labels:
        app: fluentd
    spec:
      containers:
      - name: fluentd
        image: fluentd:latest
        volumeMounts:
        - name: varlog
          mountPath: /var/log
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
```

**Why DaemonSet?**
- Automatically runs on every node, including newly added nodes
- Perfect for log collectors (Fluentd, Filebeat), monitoring agents (Node Exporter), security scanners, and network plugins
- Unlike Deployment, it guarantees one instance per node, not a fixed total count

---

### 19. Deploy new version without downtime

**Which Kubernetes feature supports this?**

**Rolling Update** via Deployment strategy:

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0   # never reduce below desired count
      maxSurge: 1         # add 1 extra Pod during update
```

**How zero-downtime works:**
1. New Pod with v2 image is created (surge)
2. New Pod starts and passes **readiness probe**
3. Service adds new Pod to endpoints — it starts receiving traffic
4. Old Pod with v1 image is terminated
5. Process repeats until all Pods run v2
6. Users never experience downtime because at least the minimum replicas are always serving traffic

**Commands:** `kubectl set image deployment/myapp app=myapp:v2` then `kubectl rollout status deployment/myapp`

---

### 20. Pod stuck in CrashLoopBackOff

**What troubleshooting steps would you take?**

**CrashLoopBackOff** means the container starts, crashes, and Kubernetes keeps retrying with increasing delays.

**Step-by-step troubleshooting:**

1. **`kubectl describe pod <pod-name>`**
   - Check **Events** section at the bottom for error messages
   - Look at restart count, last state, exit code
   - Check probe failures, OOMKilled, image pull errors

2. **`kubectl logs <pod-name>`**
   - Read the application's crash output (Python traceback, missing file, connection refused)

3. **`kubectl logs <pod-name> --previous`**
   - View logs from the **previous** crashed container instance (critical when the current container dies instantly)

4. **`kubectl get events --sort-by='.lastTimestamp'`**
   - See cluster-wide events related to the Pod

5. **`kubectl exec -it <pod-name> -- /bin/sh`**
   - If the container stays up briefly, exec in and test commands manually

6. **Check common causes:**
   - Wrong image tag or missing image
   - Missing environment variables or Secrets
   - Application cannot connect to database on startup
   - Liveness probe killing the container too aggressively
   - Insufficient memory (OOMKilled)
   - Wrong command or entrypoint in container spec
   - Missing ConfigMaps or volume mounts

---

### 21. Only specific workloads should run on GPU nodes

**How would you achieve this?**

Use **Taints, Tolerations, and Node Affinity**:

**Step 1 — Taint GPU nodes** (prevents normal Pods from scheduling):
```bash
kubectl taint nodes gpu-node-1 nvidia.com/gpu=true:NoSchedule
```

**Step 2 — Add toleration to GPU workload Pods only:**
```yaml
tolerations:
- key: nvidia.com/gpu
  operator: Equal
  value: true
  effect: NoSchedule
```

**Step 3 — Add node affinity to prefer/require GPU nodes:**
```yaml
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
      - matchExpressions:
        - key: accelerator
          operator: In
          values: [nvidia-gpu]
```

**Result:** Only Pods with matching tolerations AND affinity rules can schedule on GPU nodes. Regular web app Pods stay on standard nodes, saving expensive GPU resources.

---

### 22. 500 YAML files — how Helm simplifies management

**How could Helm simplify management?**

Instead of 500 separate YAML files, create one **Helm Chart** with templates:

```
my-app-chart/
├── Chart.yaml
├── values.yaml          # dev settings
├── values-prod.yaml     # production overrides
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    └── configmap.yaml
```

**Benefits:**
- **Templates** — one `deployment.yaml` template used for all environments; only values change
- **Values files** — `values-dev.yaml`, `values-staging.yaml`, `values-prod.yaml` replace hundreds of duplicate files
- **Single command deploy** — `helm install myapp ./my-app-chart -f values-prod.yaml`
- **Easy upgrades** — `helm upgrade myapp ./my-app-chart`
- **Instant rollback** — `helm rollback myapp 1`
- **Dependency management** — chart can depend on PostgreSQL, Redis charts
- **Release history** — track every deployment version

500 files become ~10 templates + 3 value files per environment.

---

### 23. Dev, testing, and production in one cluster

**How would Namespaces help?**

Create isolated logical environments within one physical cluster:

```bash
kubectl create namespace dev
kubectl create namespace testing
kubectl create namespace production
```

**What Namespaces provide:**
| Feature | Benefit |
|---------|---------|
| **Resource isolation** | Apps in `dev` cannot accidentally affect `production` |
| **RBAC** | Developers access `dev` only; ops team accesses `production` |
| **Resource Quotas** | Limit `dev` to 4 CPU / 8 GB RAM; `production` gets more |
| **Network Policies** | Block `dev` Pods from reaching `production` database |
| **Naming** | Same app name (`web-app`) can exist in all three namespaces |
| **Cost efficiency** | One cluster instead of three separate clusters |

Deploy with: `kubectl apply -f deployment.yaml -n production`

---

### 24. Expose Frontend, Backend API, and Database

**How would Kubernetes Services be used?**

| Component | Service Type | Why |
|-----------|-------------|-----|
| **Frontend** (React/Angular) | LoadBalancer or Ingress | Public-facing; users access via browser |
| **Backend API** (REST/GraphQL) | ClusterIP + Ingress path | Internal service; exposed via Ingress at `/api` |
| **Database** (PostgreSQL) | ClusterIP only | **Never** expose externally; only backend connects |

**Recommended architecture with Ingress:**
```
Internet → Ingress Controller (NGINX)
              ├── /        → frontend-service:80  (ClusterIP)
              └── /api     → backend-service:8080 (ClusterIP)
                                └── backend connects to db-service:5432 (ClusterIP)
```

**Security rules:**
- Database Service should have **no Ingress rule** and **NetworkPolicy** blocking external access
- Frontend talks to backend via Ingress path or internal service
- Backend talks to database via internal ClusterIP only

---

### 25. Developer accidentally deletes a Pod — will the app go down?

**Will the application go down? Why or why not?**

**No, the application will NOT go down** — if the Pod is managed by a controller (Deployment, ReplicaSet, or StatefulSet).

**Why:**
1. The Deployment's ReplicaSet controller continuously compares **desired replicas** vs **actual running Pods**
2. When a Pod is deleted, actual count drops below desired count
3. The controller immediately schedules a **new replacement Pod**
4. The Service continues routing traffic to remaining healthy Pods during the brief gap
5. With multiple replicas, users may not notice anything at all

**When it WOULD go down:**
- Bare Pod with no controller — deleting it means it is gone permanently
- Only 1 replica and no readiness probe on remaining Pods
- StatefulSet with specific Pod identity where replacement takes time

**Best practice:** Always run production workloads under a Deployment with at least 2 replicas.

---

## MLflow Scenarios (26–35)

### 26. Trained 20 models, forgot which hyperparameters produced best accuracy

**How would MLflow help?**

Every training run automatically records:
- **Parameters** — learning rate, max depth, n_estimators, etc.
- **Metrics** — accuracy, loss, F1-score, etc.
- **Artifacts** — model files, plots, confusion matrices
- **Tags** — experiment name, data version, notes

**To find the best model:**
1. Open MLflow Tracking UI (`mlflow ui`)
2. Navigate to your experiment
3. Sort the runs table by **accuracy** column (descending)
4. The top row shows the exact hyperparameters that produced the best result
5. Click the run to see all details, or programmatically: `mlflow.search_runs(order_by=[metrics.accuracy DESC], max_results=1)`

You never need to remember or manually track hyperparameters again.

---

### 27. Which model generated last month's predictions?

**How would MLflow answer this?**

1. Open **MLflow Model Registry**
2. Check the model version that was in **Production** stage during last month
3. Each registered version links to:
   - The original **Run ID** (when it was trained)
   - Training **parameters** and **metrics**
   - **Artifacts** (model file, training data snapshot)
   - **Timestamps** of registration and stage transitions
   - **Who** registered and promoted the model

**Example:** Model `fraud-detector` version 3 was in Production from Jan 1–Jan 31. Click version 3 → see Run ID `a1b2c3` → view exact training config, data, and metrics used for last month's predictions.

This provides **full model lineage** — from training data to production predictions.

---

### 28. Team member trains with different parameters — compare results

**How would you compare the results?**

Both runs appear in the same **Experiment** in MLflow:

**Via UI:**
1. Open the experiment in MLflow UI
2. Select both runs (checkboxes)
3. Click **Compare** — side-by-side view of parameters, metrics, and artifacts
4. Visualize metric differences with parallel coordinates plot or scatter plot

**Via code:**
```python
import mlflow
runs = mlflow.search_runs(experiment_ids=[1], order_by=[metrics.accuracy DESC])
print(runs[[params.learning_rate, params.max_depth, metrics.accuracy]])
```

You can objectively determine which parameter combination performs better without relying on memory or spreadsheets.

---

### 29. Store accuracy graphs, feature importance plots, and model files

**Which MLflow feature would you use?**

**Artifacts** — MLflow's feature for storing any output files linked to a run:

```python
import mlflow

with mlflow.start_run():
    # Log metrics
    mlflow.log_metric(accuracy, 0.95)

    # Log plots as artifacts
    mlflow.log_artifact(accuracy_plot.png)
    mlflow.log_artifact(feature_importance.png)

    # Log the model file
    mlflow.sklearn.log_model(model, model)
```

All files are stored in the artifact store (local `./mlruns` or remote S3/Azure/GCS) and accessible from the MLflow UI or programmatically. Everything is tied to the specific run for full traceability.

---

### 30. Model approved for production — Model Registry helps how?

**How would Model Registry help?**

1. **Register** the model: `mlflow.register_model(runs:/<run_id>/model, fraud-detector)`
2. **Version** it automatically (v1, v2, v3...)
3. **Transition stages**: None → Staging → Production → Archived
4. **Add metadata**: description, tags, approval notes
5. **Enforce governance**: only approved models reach Production stage

**Production deployment references the registry:**
```python
model = mlflow.pyfunc.load_model(models:/fraud-detector/Production)
```

**Benefits:**
- No ad-hoc file paths or model_final_v2_REAL.pkl on someone's laptop
- Clear audit trail of which version is live
- Easy promotion and demotion between stages
- Team collaboration with shared model store

---

### 31. Production model begins underperforming

**How could MLflow help identify the issue?**

1. **Compare metrics** — Open the production model's original run in MLflow and compare its training metrics (accuracy, precision) against recent candidate runs. Is a newer model available that performs better?

2. **Check model lineage** — Review the training data version, parameters, and code commit used for the production model. Has the input data distribution changed (data drift)?

3. **Review artifacts** — Compare feature importance plots and confusion matrices between the production model and newer experiments.

4. **Stage comparison** — Check if a model in Staging outperforms the current Production model on recent validation data.

5. **Rollback** — If a recent promotion caused the issue, transition the previous Production version back to Production stage in the Registry.

MLflow gives you the full history to diagnose whether the issue is model quality, data drift, or a bad deployment.

---

### 32. Multiple data scientists training models simultaneously

**How does MLflow organize experiments?**

MLflow provides a centralized, conflict-free organization system:

- **Experiments** — logical groups per project (e.g., fraud-detection, churn-prediction)
- **Runs** — each training session gets a unique **Run ID**; runs never overwrite each other
- **Tracking Server** — central server stores all metadata; scientists log to the same URI
- **User tags** — each run can be tagged with the scientist's name, git branch, or task

**Example:** Data scientist A and B both train 10 models today. All 20 runs appear in the experiment, each with unique IDs, searchable and comparable. No conflicts, no lost work, full visibility for the team.

---

### 33. Deploy exact model version from six months ago

**Which MLflow capability enables this?**

**Model versioning in the Model Registry:**

Every registered model has **immutable versions**. Version 2 registered six months ago is exactly the same today.

```python
# Load specific version
model = mlflow.pyfunc.load_model(models:/fraud-detector/2)

# Or load whatever is in Production stage
model = mlflow.pyfunc.load_model(models:/fraud-detector/Production)
```

**Why this works:**
- Model artifacts are stored permanently in the artifact store
- Version numbers never change or get overwritten
- Each version links to the exact run, parameters, metrics, and code
- Full reproducibility — the model behaves identically to when it was first trained

---

### 34. Compliance team needs complete history of model changes

**How would MLflow support auditing?**

MLflow Model Registry provides a complete audit trail:

| Audit Information | Where in MLflow |
|-------------------|-----------------|
| Who registered each version | Registry version metadata |
| When each version was created | Timestamps on each version |
| Stage transitions (Staging → Production → Archived) | Stage change history with timestamps |
| Training parameters used | Linked Run ID → parameters |
| Performance metrics at training time | Linked Run ID → metrics |
| Training data and code version | Linked Run ID → artifacts and tags |
| Who approved production deployment | Tags and stage transition notes |

Compliance teams can query the full history programmatically or export it from the MLflow UI. Every model change is traceable from training through deployment to retirement.

---

### 35. Organization wants reproducible ML experiments

**How does MLflow contribute?**

MLflow captures everything needed to reproduce any experiment:

| Component | What MLflow Records |
|-----------|-------------------|
| **Code** | Git commit hash (via `MLFLOW_GIT_COMMIT` or Projects) |
| **Parameters** | All hyperparameters via `log_param()` |
| **Metrics** | All evaluation metrics via `log_metric()` |
| **Environment** | `conda.yaml` or `requirements.txt` in artifacts |
| **Data** | Dataset version/hash logged as artifact or tag |
| **Model** | Serialized model file in artifacts |
| **Results** | Plots, reports, confusion matrices |

**To reproduce:** Given any Run ID, a colleague can reload the exact same code environment, parameters, data, and model. MLflow Projects (`mlflow run`) can even automate the entire reproduction with a single command.

---

## Integrated MLOps Scenarios (36–50)

### 36. Training to production using MLflow, Docker, and Kubernetes

**Describe the steps from training to production:**

**Step 1 — Train & Track (MLflow)**
```python
import mlflow
mlflow.set_experiment(fraud-detection)
with mlflow.start_run():
    model = train_model(data)
    mlflow.log_param(learning_rate, 0.01)
    mlflow.log_metric(accuracy, 0.96)
    mlflow.sklearn.log_model(model, model)
```

**Step 2 — Register & Promote (MLflow Registry)**
```python
result = mlflow.register_model(runs:/abc123/model, fraud-detector)
client.transition_model_version_stage(fraud-detector, 1, Production)
```

**Step 3 — Containerize (Docker)**
```dockerfile
FROM python:3.10-slim
RUN pip install mlflow scikit-learn fastapi uvicorn
COPY serve.py .
CMD [uvicorn, serve:app, --host, 0.0.0.0, --port, 8080]
```
Build: `docker build -t fraud-api:1.0 .`

**Step 4 — Deploy (Kubernetes)**
```bash
kubectl apply -f deployment.yaml   # 3 replicas, readiness probes
kubectl apply -f service.yaml      # ClusterIP + Ingress
kubectl apply -f hpa.yaml          # auto-scaling
```

**Step 5 — Monitor & Iterate**
Monitor latency and accuracy drift. When performance drops, retrain, register new version, and roll out via CI/CD.

---

### 37. ML API serving predictions to millions of users

**How would Docker and Kubernetes work together?**

**Docker's role:**
- Package the model-serving API (FastAPI/Flask + MLflow model loader) into a lightweight, portable image
- Include exact Python version, ML libraries, and serving code
- Image runs identically whether tested locally or deployed to a 100-node cluster

**Kubernetes' role:**
- Run **dozens of replicas** of the serving container across multiple nodes
- **LoadBalancer/Ingress** distributes millions of requests across all healthy replicas
- **HPA** automatically scales from 5 to 500 Pods during peak traffic
- **Self-healing** — crashed Pods are replaced instantly
- **Rolling updates** — deploy new model versions without dropping traffic
- **Resource limits** — prevent any single Pod from consuming all node resources

**Together:** Docker ensures consistency; Kubernetes ensures scale, availability, and resilience.

---

### 38. New model approved in Registry — CI/CD auto-deploy

**How can CI/CD automatically deploy it?**

**Pipeline trigger:** Webhook fires when model transitions to **Production** stage in MLflow Registry.

**CI/CD steps (e.g., GitHub Actions):**
```yaml
# 1. Pull model from Registry
- mlflow models build-docker -m models:/fraud-detector/Production -n fraud-api

# 2. Build and tag Docker image
- docker build -t registry.example.com/fraud-api:${{ github.sha }} .

# 3. Push to container registry
- docker push registry.example.com/fraud-api:${{ github.sha }}

# 4. Deploy to Kubernetes
- kubectl set image deployment/fraud-api app=registry.example.com/fraud-api:${{ github.sha }}
- kubectl rollout status deployment/fraud-api
```

**Result:** Model approval in MLflow automatically triggers build → test → deploy with no manual steps. Full traceability from model version to running container.

---

### 39. Prediction service experiences heavy traffic

**How would Kubernetes scale the model-serving containers?**

**Horizontal Pod Autoscaler (HPA):**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: model-serving-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: model-serving
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        averageUtilization: 60
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        averageValue: 1000
```

**How it works during heavy traffic:**
1. Request rate exceeds 1000 req/s per Pod → HPA scales up
2. New Pods start, load model from MLflow artifact store, pass readiness probe
3. Service distributes traffic across all Pods
4. When traffic decreases, HPA scales down to save costs
5. If cluster runs out of nodes, **Cluster Autoscaler** adds new nodes

---

### 40. Model-serving Pod crashes

**How does Kubernetes maintain availability?**

1. **Deployment controller** detects the Pod is no longer running
2. Immediately schedules a **replacement Pod** on a healthy node
3. New Pod pulls the model (from MLflow artifact store or baked into image)
4. Passes **readiness probe** → added to Service endpoints
5. **Service** was already routing traffic to other healthy replicas — users unaffected
6. With `replicas: 3` and `maxUnavailable: 0`, at least 3 Pods are always serving

**Additional safeguards:**
- **Liveness probes** restart containers that hang (not just crash)
- **PodDisruptionBudget** ensures minimum available Pods during node maintenance
- **Multiple replicas** across different nodes prevent single-point-of-failure

---

### 41. All model artifacts stored centrally

**How would MLflow and cloud storage work together?**

**Setup:**
```bash
# Start MLflow server with remote artifact store
mlflow server \
  --backend-store-uri postgresql://user:pass@db:5432/mlflow \
  --default-artifact-root s3://my-mlflow-artifacts/
```

**How it works:**
1. Data scientists log models, plots, and files during training
2. MLflow automatically uploads artifacts to **S3** (or Azure Blob, GCS)
3. Metadata (params, metrics, run info) stored in **PostgreSQL**
4. Any team member accesses artifacts via Tracking URI — no local copies needed
5. Deployment pipelines pull models directly: `models:/fraud-detector/Production`
6. Kubernetes Pods download model artifacts at startup from S3

**Benefits:** Central storage, no lost artifacts, shared access, backup via cloud provider, unlimited storage capacity.

---

### 42. It worked locally but not in production

**How can Docker help prevent this?**

**The problem:** Local machine has Python 3.11, production has 3.8. Local has system libraries installed globally; production does not. Different file paths, env vars, and OS configurations.

**Docker's solution:**
1. Developer builds and tests using the **same Dockerfile** used in production
2. `docker build -t myapp:1.0 .` on local machine
3. `docker push myapp:1.0` to registry
4. Production pulls and runs the **exact same image**
5. Only environment variables differ (database URL, API keys) — handled via Kubernetes ConfigMaps/Secrets

**Result:** If it works in the Docker container locally, it will work in the same container in production. The environment is guaranteed identical.

---

### 43. Zero-downtime model updates

**Which Kubernetes deployment strategy would you use?**

**Rolling Update** (default Deployment strategy):

```yaml
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  template:
    spec:
      containers:
      - name: model-api
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
```

**Process:**
1. New Pod with updated model starts (6 Pods total temporarily)
2. New Pod loads model, passes readiness probe
3. Service begins routing traffic to new Pod
4. One old Pod terminates (back to 5 Pods, mix of old and new)
5. Repeat until all 5 Pods run the new model
6. Zero requests dropped — always at least 5 healthy Pods serving

**For safer rollouts:** Use **canary deployment** (route 5% traffic to new version first) or **blue-green** (switch all traffic at once after validation).

---

### 44. MLflow server running in Kubernetes

**What Kubernetes resources would be required?**

| Resource | Purpose |
|----------|---------|
| **Deployment** | Run MLflow tracking server Pods (with replicas for HA) |
| **Service** | Expose MLflow API/UI internally (ClusterIP) or externally (LoadBalancer) |
| **PersistentVolumeClaim** | Persistent storage for PostgreSQL database (experiment metadata) |
| **ConfigMap** | Non-sensitive config (artifact root path, server host/port) |
| **Secret** | Database credentials, S3 access keys |
| **Ingress** | HTTPS access to MLflow UI for data scientists |
| **StatefulSet** (optional) | For PostgreSQL if running DB inside the cluster |

**Example deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mlflow-server
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: mlflow
        image: mlflow-server:latest
        args: [mlflow, server, --backend-store-uri, $(DB_URI), --default-artifact-root, s3://artifacts/]
        envFrom:
        - secretRef:
            name: mlflow-secrets
        ports:
        - containerPort: 5000
```

---

### 45. Architecture: PostgreSQL + MLflow + Model Serving API + Monitoring

**How would you design the architecture?**

```
                         ┌─────────────────────────────────────────────┐
                         │              Kubernetes Cluster              │
                         │                                              │
  Internet ──► Ingress ──┤  ┌──────────────┐    ┌───────────────────┐  │
              (HTTPS)    │  │   Frontend    │    │  Model Serving API │  │
                         │  │  (React App)  │    │  (FastAPI + MLflow)│  │
                         │  │  Deployment   │    │  Deployment + HPA  │  │
                         │  └──────────────┘    └────────┬──────────┘  │
                         │                               │              │
                         │  ┌──────────────┐    ┌───────▼──────────┐  │
                         │  │  MLflow Server│◄───│  Model Registry  │  │
                         │  │  Deployment   │    │  (model versions)│  │
                         │  └──────┬───────┘    └───────────────────┘  │
                         │         │                                      │
                         │  ┌──────▼───────┐    ┌───────────────────┐  │
                         │  │  PostgreSQL   │    │  S3 / Artifact    │  │
                         │  │  StatefulSet  │    │  Storage (models,  │  │
                         │  │  + PVC        │    │  plots, metrics)  │  │
                         │  └──────────────┘    └───────────────────┘  │
                         │                                              │
                         │  ┌──────────────────────────────────────┐  │
                         │  │  Prometheus + Grafana (DaemonSet)     │  │
                         │  │  Monitor: latency, CPU, memory, RPS   │  │
                         │  └──────────────────────────────────────┘  │
                         └─────────────────────────────────────────────┘
```

**Design decisions:**
- **Namespaces:** `mlflow-system` for MLflow/DB, `serving` for API, `monitoring` for Prometheus/Grafana
- **PostgreSQL:** StatefulSet with PVC for durable metadata storage
- **MLflow:** Deployment with 2 replicas, connects to PostgreSQL and S3
- **Model Serving API:** Deployment with HPA (3–50 replicas), loads models from MLflow Registry
- **Monitoring:** Prometheus scrapes metrics from all components; Grafana dashboards for visualization
- **Secrets:** Database passwords and S3 keys in Kubernetes Secrets
- **Ingress:** Single entry point with path routing and TLS termination

---

### 46. Automated retraining when new data arrives

**How would MLflow fit into the pipeline?**

**End-to-end automated pipeline:**

1. **Data arrival trigger** — New data lands in S3 / Kafka message / scheduled cron job fires
2. **Training job starts** — Kubernetes Job or Airflow DAG launches training container
3. **MLflow Tracking** — Training logs all parameters, metrics, and artifacts automatically
4. **Model evaluation** — Compare new model metrics against current Production model in Registry
5. **Conditional promotion** — If new accuracy > production accuracy + threshold:
   - Register model in MLflow Registry
   - Transition to Staging → run validation tests → promote to Production
6. **CI/CD deploys** — New Production model version triggers Docker build and Kubernetes rollout
7. **Notification** — Alert team via Slack/email with run comparison results

MLflow is the **central hub** that connects training results to deployment decisions with full traceability.

---

### 47. ML model suddenly consumes excessive CPU

**Which Kubernetes tools would help identify and manage the issue?**

**Identify the problem:**
| Tool | Command/Usage |
|------|--------------|
| `kubectl top pods` | See real-time CPU usage per Pod — find the culprit |
| `kubectl top nodes` | Check if the entire node is under pressure |
| **Prometheus + Grafana** | Historical CPU trends, alerts on sustained high usage |
| `kubectl describe pod` | Check if Pod is CPU-throttled (limits too low) |

**Manage the issue:**
| Tool | Action |
|------|--------|
| **Resource limits** | Set `limits.cpu: 2` to cap maximum CPU per Pod |
| **HPA** | Scale out to more replicas so load is distributed |
| **VPA** | Automatically adjust CPU requests based on actual usage |
| **Pod restart** | `kubectl rollout restart deployment/model-serving` |
| **MLflow comparison** | Check if a recent model version is computationally heavier |

---

### 48. Model rollback capability

**How would MLflow Registry and Kubernetes support rollback?**

**MLflow Registry rollback:**
1. Current Production model is version 5 (underperforming)
2. Transition version 4 back to **Production** stage
3. Version 5 moved to **Archived**
4. All deployments now reference `models:/fraud-detector/Production` → loads version 4

**Kubernetes rollback:**
```bash
# Instant rollback to previous Deployment revision
kubectl rollout undo deployment/model-serving

# Or rollback to specific revision
kubectl rollout history deployment/model-serving
kubectl rollout undo deployment/model-serving --to-revision=3
```

**Combined rollback (< 5 minutes):**
1. MLflow: revert Production stage to previous model version
2. CI/CD: rebuild Docker image with previous model
3. Kubernetes: `kubectl rollout undo` or deploy previous image tag
4. Verify: check metrics in Grafana return to normal

Both systems maintain version history, making rollback fast and safe.

---

### 49. Monitor model latency, CPU, memory, request count

**Which tools would you use?**

| Metric | Tool | How |
|--------|------|-----|
| **Model latency** | Prometheus + Grafana | Instrument serving API with histogram metrics; alert if p99 > 200ms |
| **CPU usage** | Metrics Server + Prometheus | `kubectl top pods` for real-time; Prometheus for trends and alerts |
| **Memory usage** | Metrics Server + Prometheus | Monitor per-Pod memory; alert on OOM risk |
| **Request count** | Prometheus + Ingress controller | Count HTTP requests per second; HPA scaling decisions |
| **Model accuracy drift** | MLflow + custom monitoring | Compare live prediction distributions vs training data |
| **Error rate** | Prometheus + Alertmanager | Alert if 5xx errors exceed 1% |

**Dashboard setup (Grafana):**
- Panel 1: Request rate (RPS) over time
- Panel 2: Latency percentiles (p50, p95, p99)
- Panel 3: CPU and memory per Pod
- Panel 4: Error rate and status codes
- Panel 5: Active Pod replica count (HPA status)

---

### 50. Design an end-to-end MLOps platform

**Design an end-to-end MLOps platform using Docker, Kubernetes, MLflow, CI/CD, and Monitoring.**

---

#### Platform Overview

An end-to-end MLOps platform automates the complete machine learning lifecycle — from data ingestion and model training through deployment, scaling, monitoring, and rollback. The five core technologies work together as follows:

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   TRAINING   │───►│   TRACKING   │───►│  DEPLOYMENT  │───►│   SCALING    │───►│  MONITORING  │
│   MLflow     │    │   MLflow     │    │ Docker + K8s │    │  Kubernetes  │    │ Prometheus   │
│   Projects   │    │  Registry    │    │   CI/CD      │    │    HPA       │    │  + Grafana   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────┬───────┘
                                                                                        │
                                                                                  ┌─────▼──────┐
                                                                                  │  ROLLBACK  │
                                                                                  │ MLflow +   │
                                                                                  │ Kubernetes │
                                                                                  └────────────┘
```

---

#### 1. TRAINING

**Purpose:** Data scientists train models in a reproducible, trackable way.

**How it works:**
- Data scientists write training scripts that use **MLflow Tracking API**:
  ```python
  import mlflow
  mlflow.set_experiment(customer-churn)
  with mlflow.start_run():
      mlflow.log_param(learning_rate, 0.01)
      mlflow.log_param(max_depth, 10)
      model = train(X_train, y_train)
      accuracy = evaluate(model, X_test, y_test)
      mlflow.log_metric(accuracy, accuracy)
      mlflow.sklearn.log_model(model, model)
      mlflow.log_artifact(confusion_matrix.png)
  ```
- Training runs inside **Docker containers** (via MLflow Projects or Kubernetes Jobs) ensuring consistent environments
- **MLflow autologging** (`mlflow.autolog()`) automatically captures parameters, metrics, and models for supported frameworks (scikit-learn, TensorFlow, PyTorch)
- Training can be triggered manually, on a schedule (CronJob), or automatically when new data arrives (event-driven)

**Tools:** MLflow Tracking, Docker (training environment), Kubernetes Jobs (scalable training)

---

#### 2. TRACKING

**Purpose:** Centralize all experiment data so nothing is lost and everything is comparable.

**How it works:**
- **MLflow Tracking Server** runs in Kubernetes as a Deployment:
  - Backend store: **PostgreSQL** (experiment metadata, parameters, metrics)
  - Artifact store: **AWS S3 / Azure Blob / GCS** (model files, plots, datasets)
- Data scientists access the **MLflow UI** (port 5000) to:
  - Browse all experiments and runs
  - Sort and filter by metrics (find best accuracy)
  - Compare runs side-by-side
  - View artifacts (plots, model files)
- **Model Registry** stores approved models with versioning and lifecycle stages:
  - `None` → `Staging` → `Production` → `Archived`
- Every model version links back to its training run for full lineage

**Tools:** MLflow Tracking Server, PostgreSQL, S3, Kubernetes Deployment

---

#### 3. DEPLOYMENT

**Purpose:** Automatically deploy approved models to production in a consistent, reliable way.

**How it works:**

**Step 1 — Model approval:** Data scientist or automated pipeline promotes best model to **Production** in MLflow Registry.

**Step 2 — CI/CD pipeline triggers** (GitHub Actions / Jenkins / ArgoCD):
```yaml
# CI/CD Pipeline
on:
  model_promoted_to_production:
    - mlflow models build-docker -m models:/churn-model/Production -n churn-api
    - docker build -t registry.io/churn-api:$VERSION .
    - docker push registry.io/churn-api:$VERSION
    - helm upgrade churn-api ./charts/churn-api --set image.tag=$VERSION
    - kubectl rollout status deployment/churn-api
```

**Step 3 — Kubernetes deploys:**
- **Deployment** with 3+ replicas of the model-serving container
- **Service** (ClusterIP) for internal load balancing
- **Ingress** for external HTTPS access
- **Readiness/Liveness probes** ensure only healthy Pods receive traffic
- **Rolling Update** strategy for zero-downtime deployments

**Tools:** Docker (containerization), Kubernetes (orchestration), CI/CD (automation), Helm (package management), MLflow Registry (model source)

---

#### 4. SCALING

**Purpose:** Handle varying traffic loads automatically without manual intervention.

**How it works:**

**Horizontal Pod Autoscaler (HPA):**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 3
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        averageValue: 500
```

**Scaling behavior:**
- Low traffic (night): HPA scales down to 3 replicas — saves cost
- Peak traffic (business hours): HPA scales up to 100 replicas — handles load
- **Cluster Autoscaler** adds new Kubernetes nodes when Pods cannot be scheduled
- **Ingress / LoadBalancer** distributes traffic across all replicas

**Tools:** Kubernetes HPA, Cluster Autoscaler, Metrics Server, Ingress Controller

---

#### 5. MONITORING

**Purpose:** Detect problems before users are affected; ensure models perform as expected.

**What to monitor:**

| Category | Metrics | Tool |
|----------|---------|------|
| **Infrastructure** | CPU, memory, disk, network per Pod/node | Prometheus + Grafana |
| **Application** | Request latency (p50, p95, p99), error rate, RPS | Prometheus + custom exporters |
| **Model performance** | Prediction accuracy, data drift, feature distribution | MLflow + Evidently AI / custom scripts |
| **Business** | Predictions per hour, model confidence scores | Grafana dashboards |

**Alerting (Alertmanager):**
- Latency p99 > 500ms → page on-call engineer
- Error rate > 1% → auto-scale + alert
- Model accuracy drops below threshold → trigger retraining pipeline
- Pod crash loop → alert + auto-restart

**Tools:** Prometheus (metrics collection), Grafana (visualization), Alertmanager (alerting), MLflow (model metrics history)

---

#### 6. ROLLBACK

**Purpose:** Quickly revert to a known-good model version when issues are detected.

**How it works:**

**Scenario:** New model version 6 deployed to production. Accuracy drops. Need to rollback.

**Step 1 — MLflow Registry rollback:**
```python
client = mlflow.tracking.MlflowClient()
# Archive the bad version
client.transition_model_version_stage(churn-model, 6, Archived)
# Restore previous good version
client.transition_model_version_stage(churn-model, 5, Production)
```

**Step 2 — Kubernetes rollback:**
```bash
kubectl rollout undo deployment/churn-api
# Or deploy specific previous image
kubectl set image deployment/churn-api app=registry.io/churn-api:v5
kubectl rollout status deployment/churn-api
```

**Step 3 — Verify:**
- Check Grafana dashboards — latency and error rate return to normal
- Compare MLflow metrics — version 5 accuracy restored
- Total rollback time: **under 5 minutes**

**Tools:** MLflow Registry (model version management), Kubernetes rollout undo (container rollback), CI/CD (automated rollback pipeline)

---

#### Complete Platform Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MLOps Platform Architecture                      │
│                                                                         │
│  ┌─────────┐   ┌──────────────┐   ┌─────────────┐   ┌───────────────┐  │
│  │  Data    │──►│  Training    │──►│  MLflow     │──►│  Model        │  │
│  │  Pipeline│   │  (K8s Job +  │   │  Tracking   │   │  Registry     │  │
│  │  (ETL)   │   │   Docker)    │   │  Server     │   │  (Staging/    │  │
│  └─────────┘   └──────────────┘   └─────────────┘   │  Production)  │  │
│                                                        └───────┬───────┘  │
│                                                                │          │
│  ┌─────────┐   ┌──────────────┐   ┌─────────────┐   ┌───────▼───────┐  │
│  │  CI/CD  │◄──│  Docker      │◄──│  Approved   │◄──│  Model        │  │
│  │ Pipeline│   │  Registry    │   │  Model      │   │  Promotion    │  │
│  │(GitHub  │   │  (ECR/ACR)   │   │  Version    │   │  Workflow     │  │
│  │ Actions)│   └──────────────┘   └─────────────┘   └───────────────┘  │
│  └────┬────┘                                                            │
│       │                                                                 │
│  ┌────▼─────────────────────────────────────────────────────────────┐   │
│  │                    Kubernetes Cluster                             │   │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌─────────────┐  │   │
│  │  │ Model API  │  │ Model API  │  │ Model API│  │    HPA      │  │   │
│  │  │  Pod (v5)  │  │  Pod (v5)  │  │ Pod (v5) │  │ 3→100 pods  │  │   │
│  │  └────────────┘  └────────────┘  └──────────┘  └─────────────┘  │   │
│  │       ▲                                                            │   │
│  │  ┌────┴───────┐  ┌────────────┐  ┌──────────────────────────┐  │   │
│  │  │  Ingress   │  │  Service   │  │  Prometheus + Grafana    │  │   │
│  │  │  (HTTPS)   │  │ (ClusterIP)│  │  (Monitoring + Alerts)   │  │   │
│  │  └────────────┘  └────────────┘  └──────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  ROLLBACK: MLflow Registry (revert version) + kubectl rollout   │   │
│  │  undo (revert container) → < 5 minutes to restore service       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

#### Technology Responsibilities Summary

| Technology | Role in Platform |
|------------|-----------------|
| **Docker** | Packages training environments and model-serving APIs into portable, consistent containers. Eliminates environment differences between dev, staging, and production. |
| **Kubernetes** | Orchestrates all containers at scale. Provides auto-scaling (HPA), self-healing, load balancing (Services/Ingress), rolling updates, and resource management across a cluster of machines. |
| **MLflow** | Manages the entire ML lifecycle. Tracks experiments (parameters, metrics, artifacts), maintains Model Registry with versioning and lifecycle stages, and provides the central source of truth for which model is in production. |
| **CI/CD** | Automates the path from model approval to production deployment. Builds Docker images, runs tests, pushes to registry, and deploys to Kubernetes — eliminating manual deployment steps and human error. |
| **Monitoring** | Provides real-time visibility into system health (CPU, memory, latency, errors) and model performance (accuracy drift, prediction distributions). Enables proactive alerting and data-driven rollback decisions. |

---

#### End-to-End Workflow Example

1. **Monday:** Data scientist trains 15 model variants → MLflow logs all runs → best model (accuracy 0.97) registered as version 8
2. **Tuesday:** Version 8 promoted to Staging → automated tests pass → promoted to Production
3. **Tuesday:** CI/CD builds Docker image `churn-api:v8` → pushes to ECR → Helm deploys to Kubernetes with rolling update
4. **Wednesday:** Traffic increases → HPA scales from 3 to 25 Pods → Grafana shows healthy latency
5. **Thursday:** Accuracy drops to 0.82 (data drift detected) → Alertmanager fires alert
6. **Thursday:** MLflow Registry rolls back to version 7 → CI/CD deploys `churn-api:v7` → `kubectl rollout undo` → service restored in 4 minutes
7. **Friday:** New training pipeline triggered with updated data → cycle repeats

This closed-loop system ensures models are always tracked, deployments are automated and consistent, traffic is handled at any scale, problems are detected early, and recovery is fast.
