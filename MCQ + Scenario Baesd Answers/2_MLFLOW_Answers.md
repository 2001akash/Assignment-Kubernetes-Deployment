# MLflow MCQs — Answers

1. B — MLflow is an open-source platform for managing the full machine learning lifecycle.

2. B — MLflow Tracking is mainly used to log experiments — parameters, metrics, and artifacts from each run.

3. B — A Run is a single execution of a machine learning experiment.

4. B — An Experiment is a group of related runs, like all runs for one project.

5. B — We use `mlflow.log_metric()` to log a metric like accuracy or loss.

6. B — We use `mlflow.log_param()` to log a hyperparameter like learning rate.

7. B — Artifacts are output files from a run — models, plots, CSV files, etc.

8. B — Model Registry is a central place to store models with versioning and lifecycle stages.

9. B — An MLflow Model is a standard way to package a trained model so it can be deployed anywhere.

10. B — MLflow Projects package ML code so anyone can reproduce and run it.

11. B — The `MLproject` file defines how to run an MLflow Project.

12. B — `mlflow run` executes an MLflow Project.

13. B — By default artifacts are stored locally in the `./mlruns` directory.

14. B — `mlflow.transition_model_version_stage()` moves a model between stages like Staging and Production.

15. C — Production is the stage where a model is actively serving real predictions.

16. B — A Run ID is a unique identifier assigned to each run.

17. B — The MLflow Tracking UI lets us compare multiple runs side by side.

18. B — Staging is where a model is tested before being promoted to Production.

19. B — `mlflow ui` starts the MLflow Tracking UI in the browser.

20. A — The MLflow UI runs on port 5000 by default.

21. B — The Registry component handles the model lifecycle — versioning, staging, promotion.

22. A — A Tracking Server is the central server that stores experiment metadata and run info.

23. C — We use framework-specific methods like `mlflow.sklearn.log_model()` to log a full model.

24. C — `mlflow.sklearn` is the flavor used for scikit-learn models.

25. A — `mlflow.tensorflow` is used for TensorFlow models.

26. B — `mlflow.pytorch` is used for PyTorch models.

27. B — A Model Flavor is how MLflow represents a model for a specific framework.

28. B — Model signatures define what inputs and outputs the model expects.

29. A — MLflow Projects improve reproducibility by packaging code, dependencies, and entry points.

30. D — MLflow supports MySQL, PostgreSQL, and SQLite as backend databases.

31. B — The Tracking URI tells MLflow where the tracking server is located.

32. B — `mlflow.set_tracking_uri()` sets which tracking server to log to.

33. B — Nested runs let us organize related runs in a parent-child hierarchy.

34. B — `mlflow.set_experiment()` sets which experiment new runs belong to.

35. B — Autologging automatically logs parameters, metrics, and models without writing extra code.

36. B — `mlflow.autolog()` enables autologging for supported frameworks.

37. B — A registered model is a model that has been added to the Model Registry.

38. C — Archived is the stage for models that are no longer in use.

39. B — Model versioning lets us track and manage changes to models over time.

40. D — MLflow can deploy models to REST endpoints, cloud platforms, and local environments.

41. A — `mlflow models serve` runs a model as a local REST API for testing.

42. A — The `MLmodel` file contains metadata about the model and which flavors are available.

43. A — Model Registry helps teams collaborate by sharing and managing models centrally.

44. B — A common use of the Registry is managing the workflow of promoting models to production.

45. D — MLflow integrates with AWS, Azure, and Google Cloud.

46. A — Artifact storage saves outputs like models, plots, and other files from experiments.

47. A — Tracking is the component most useful for comparing experiments and finding the best run.

48. D — MLflow improves reproducibility, traceability, and collaboration in ML projects.

49. D — We can log any metric — accuracy, loss, precision, recall, etc.

50. B — MLflow is best described as an end-to-end machine learning lifecycle platform.
