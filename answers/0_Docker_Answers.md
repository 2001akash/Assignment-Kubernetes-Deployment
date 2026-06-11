# Docker MCQs — Answers

1. B — Docker is mainly used for containerization of applications, not for databases or version control.

2. B — We use `docker version` to check which Docker version is installed on the system.

3. B — A Docker image is basically a template that we use to create and run containers.

4. C — `docker ps` shows only the containers that are currently running.

5. A — If we want to see stopped containers too, we run `docker ps -a`.

6. B — Dockerfile is the file where we write all the instructions to build an image.

7. C — `docker build` is the command used to build an image from a Dockerfile.

8. B — The `-t` flag is used to tag/name the image while building it.

9. C — `docker pull` downloads an image from a registry like Docker Hub.

10. B — Docker Hub is the default public registry that Docker uses.

11. B — `docker run` starts a new container from an image.

12. B — EXPOSE just documents which port the container listens on; it doesn't automatically open ports on the host.

13. C — `docker info` gives general information about the Docker installation and system.

14. A — Containers are used to run applications in an isolated environment.

15. C — `docker stop` gracefully stops a running container.

16. B — `docker rm` removes a container after it has been stopped.

17. C — `FROM` is the instruction that sets the base image in a Dockerfile.

18. A — `CMD` defines the default command that runs when the container starts.

19. B — `RUN` executes commands during the image build process, like installing packages.

20. A — `docker image ls` (or `docker images`) lists all images available locally.

21. B — Volumes are mainly used for persistent storage so data doesn't get lost when a container is removed.

22. A — `docker volume create` creates a new named volume.

23. B — Docker Compose is a tool for managing multi-container applications together.

24. B — Docker Compose typically uses a `docker-compose.yml` file.

25. C — `docker-compose up` starts all the services defined in the compose file.

26. B — `docker-compose down` stops and removes the containers, networks, etc.

27. B — A Docker network lets containers communicate with each other.

28. C — Bridge is the default network driver for standalone containers.

29. B — `docker network ls` lists all Docker networks.

30. B — The `-p` flag in `docker run` maps/publishes container ports to the host.

31. B — `docker inspect` shows detailed information about a container or image.

32. B — `docker exec` lets us run a command inside a container that is already running.

33. B — `-d` runs the container in detached mode (in the background).

34. B — `docker logs` shows the output/logs from a container.

35. C — `docker system prune` removes unused containers, images, networks, etc.

36. C — `ENTRYPOINT` sets the main executable that always runs when the container starts.

37. B — `docker history` shows the layers and commands used to build an image.

38. A — A container registry is where Docker images are stored and shared.

39. C — `docker push` uploads an image to a registry.

40. C — `docker commit` creates a new image from changes made in a running container.

41. B — `docker save` exports an image to a tar file.

42. C — `docker load` imports an image from a tar file.

43. B — Docker Swarm provides basic container orchestration across multiple nodes.

44. B — `docker swarm init` initializes a node as a Swarm manager.

45. B — Multi-stage builds help reduce the final image size by keeping only what's needed in the last stage.

46. B — `ENV` is used to set environment variables in a Dockerfile.

47. A — `.dockerignore` works like `.gitignore` — it excludes files from the build context.

48. C — `docker stats` shows live CPU, memory, and network usage of containers.

49. A — `COPY` copies files from the build context into the image.

50. C — `docker rmi` removes a Docker image from the local system.
