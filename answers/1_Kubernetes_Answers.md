# Kubernetes MCQs — Answers

1. B — Kubernetes is mainly used for container orchestration — managing containers across multiple machines.

2. C — Kubernetes was originally developed by Google before it was donated to the CNCF.

3. B — A Pod is the smallest deployable unit in Kubernetes, not a single container by itself in the API sense.

4. C — The Control Plane manages the entire Kubernetes cluster.

5. A — `kubectl cluster-info` displays basic information about the cluster.

6. B — A Pod is a group of one or more containers that share storage and network.

7. B — `kubectl get pods` lists all pods in the current namespace.

8. B — A Node is a worker machine (physical or virtual) where pods actually run.

9. C — The Scheduler decides which node a pod should run on.

10. B — etcd is a distributed key-value store that holds all cluster data.

11. A — `kubectl create -f` creates resources from a YAML file.

12. B — A Deployment is used to manage stateless apps and keep a desired number of replicas running.

13. C — `kubectl describe pod` gives detailed info about a pod including events and status.

14. B — A ReplicaSet makes sure the specified number of pod replicas are always running.

15. B — `kubectl delete pod` deletes a pod.

16. B — Namespaces are used to isolate resources within the same cluster (like dev, staging, prod).

17. A — `kubectl get ns` lists all namespaces.

18. B — A Service is how we expose applications and give them a stable network endpoint.

19. D — ClusterIP exposes a service only inside the cluster.

20. B — NodePort exposes the service on a port on every node's IP.

21. A — ClusterIP is the default service type.

22. B — kubelet is the agent that runs on each worker node and manages pods on that node.

23. A — kube-proxy handles network rules and load balancing for services on each node.

24. B — ConfigMaps store non-sensitive configuration data like config files or env values.

25. A — Secrets store sensitive data like passwords and API keys in an encoded form.

26. B — `kubectl logs` shows logs from a pod's containers.

27. B — Ingress is used for routing external HTTP/HTTPS traffic to services inside the cluster.

28. C — Ingress manages external access to services, especially for HTTP traffic.

29. B — StatefulSet is used for apps that need stable pod names and persistent storage, like databases.

30. A — A DaemonSet makes sure one pod runs on every (or selected) node — useful for log agents.

31. B — A Job runs a task until it completes successfully, unlike a Deployment which keeps pods running.

32. A — A CronJob runs Jobs on a schedule, like a cron job in Linux.

33. C — `kubectl apply` is the declarative way to create or update resources from YAML.

34. C — YAML is the most common format for Kubernetes manifest files.

35. A — `kubectl get all` shows most common resource types in a namespace.

36. B — HPA automatically scales the number of pods up or down based on CPU or other metrics.

37. B — VPA adjusts the CPU and memory requests/limits for pods over time.

38. B — A Persistent Volume (PV) is a piece of storage in the cluster.

39. A — A PVC is a request for storage that a pod can claim and use.

40. B — `kubectl exec` lets us run commands inside a running pod, like getting a shell.

41. B — The API Server is the front end of the control plane — it serves the Kubernetes API.

42. B — NetworkPolicy controls which pods can communicate with each other.

43. B — A ServiceAccount gives an identity to processes running inside pods.

44. B — `kubectl config current-context` shows which cluster/namespace we're currently using.

45. B — A Taint repels pods from a node unless they have a matching toleration.

46. A — A Toleration allows a pod to be scheduled on a tainted node.

47. B — A Helm Chart is a package that contains all the Kubernetes YAML needed for an app.

48. B — RBAC stands for Role-Based Access Control — it controls who can do what in the cluster.

49. A — `kubectl rollout` is used to manage deployments — checking status, undoing updates, etc.

50. B — Deployment is the most common resource used for rolling updates of applications.
