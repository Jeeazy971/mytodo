Voici un exemple de README.md correctement formaté en Markdown, intégrant à la fois la documentation d'origine pour le déploiement sur IBM Cloud/Kubernetes et la partie décrivant le déploiement sur Scalingo avec MongoDB, ainsi que l'historique des problèmes rencontrés et leurs solutions.

---

# MyTodo

This web app, originally built with a CLEAN stack (Cloudant NoSQL DB, Express, Angular and Node.js), is ready to be deployed on different platforms.  
Originally intended for ICP (IBM Cloud Platform) and Kubernetes, it has been adapted and extended to work on [Scalingo](https://scalingo.com) with a MongoDB add-on.

![Todo](./images/screenshot.png)

Watch this 6-minutes [YouTube video](https://youtu.be/XVVb-aLw9ow) to understand the deployment steps below.  
*Note: the video excludes the cluster provisioning.*

---

## Part 1 – Deployment on IBM Cloud/Kubernetes

### How to deploy this app in Kubernetes (ICP / IKS / ICF)

1. **Create a Kubernetes Cluster**  
   If you don't already have a Kubernetes cluster, create one **for free** from the IBM Cloud Catalog by selecting the [Kubernetes Service](https://cloud.ibm.com/kubernetes/catalog/create).  
   - Give it a **Name** and select a **Resource Group**.  
   > *20 min provisioning time*  
   ![Cluster](./images/iks-free-cluster.jpg)

2. **[Optional] Provision a Key Protect Service**  
   To securely store your API Key for Continuous Delivery, provision a [Key Protect](https://cloud.ibm.com/catalog/services/key-protect) service.  
   - Use the same **Region** as your cluster, provide a **Service Name**, select a **Resource Group** and a **Network Policy**.  
   > *2 min provisioning time*  
   ![Key Protect](./images/key-protect.jpg)

3. **Automated Deployment via Toolchain**  
   Click the button below to deploy the app into your Kubernetes cluster:  
   <a href="https://cloud.ibm.com/devops/setup/deploy?repository=https://github.com/lionelmace/mytodo&branch=master" target="_blank">
     <img src="./images/toolchain0-button.png" alt="Deploy on IBM Cloud"/>
   </a>

4. **Toolchain Setup**  
   - Enter a **Toolchain Name**, select the **Region** and the **Resource Group** where your cluster was created.  
     ![Toolchain](./images/toolchain1-create.jpg)
   - In the **Git Repos and Issue Tracking** tab, keep the default settings.  
     ![Toolchain](./images/toolchain2-git.jpg)
   - In the **Delivery Pipeline** tab, create a new API Key.  
     ![Toolchain](./images/toolchain3-newkey.jpg)
   - A panel will open; check the option **Save this key in a secrets store for reuse** (if you have created a Key Protect instance).  
     > *Keep unchecked if you do not wish to use Key Protect.*  
     ![Toolchain](./images/toolchain4-secretkey.jpg)
   - Verify the remaining details (Resource Group, Region, Cluster name) and click **Create**.  
     ![Toolchain](./images/toolchain5-final.jpg)

5. **Monitor the Pipeline**  
   - The toolchain creates a GitHub repository for the app automatically.  
     ![Toolchain](./images/toolchain6-overview.jpg)
   - Click **Delivery Pipeline** in the Overview to watch the stages progressing.  
     > *Approximately 6-min deployment time*  
     ![Toolchain](./images/toolchain7-pipeline.jpg)

6. **Access Your Application**  
   - Click **View logs and history** in the final **DEPLOY** stage and scroll down to find the link to your application.  
     ![Toolchain](./images/toolchain8-applink.jpg)  
   > For free clusters, the URL may use the IP address of a worker node.  
   > For paid clusters, the URL will be a domain name ending with *.appdomain.cloud.

Congratulations! Your app is now live on your Kubernetes cluster.

---

## Part 2 – Deployment on Scalingo with MongoDB & Issue Resolution

In addition to the ICP/Kubernetes deployment, the app has been adapted to deploy on [Scalingo](https://scalingo.com) using a MongoDB add-on. Below are the detailed steps, including the problems encountered and the solutions implemented.

### 1. Forking the Repository

- Forked the original repo: [https://github.com/smontri/mytodo.git](https://github.com/smontri/mytodo.git)  
- Updated and cloned my fork: [https://github.com/Jeeazy971/mytodo](https://github.com/Jeeazy971/mytodo)

### 2. Creating the Application on Scalingo

- Created the app with a unique name (since "mytodo" was already taken):
  ```bash
  scalingo create mytodo-jeeazy
  ```

### 3. Configuring SSH & Git Push

- An initial SSH key issue was resolved by generating an SSH key (`id_ed25519`) and adding it on Scalingo:
  ```bash
  scalingo keys-add ma-cle ~/.ssh/id_ed25519.pub
  ```
- After that, pushing code with `git push scalingo master` worked without error.

### 4. Adding the MongoDB Add-on

- Provisioned MongoDB on Scalingo using the free plan:
  ```bash
  scalingo -a mytodo-jeeazy addons-add mongodb mongo-starter-512
  ```
- This add-on automatically provides the environment variable `SCALINGO_MONGO_URL` (with alias `MONGO_URL`), which contains the connection string.  
  You can verify this with:
  ```bash
  scalingo -a mytodo-jeeazy env
  ```

### 5. Fixing the MongoDB Connection Issue

#### **Problem:**  
Initially, the app was configured to use a default database named `todos`. However, the MongoDB add-on on Scalingo provisions a database with a specific name (e.g., `mytodo-jeeazy-368`). This mismatch resulted in a "500 Internal Server Error" with an "Unauthorized" error when accessing `/api/todos`.

#### **Solution:**  
I modified the MongoDB connection module (`lib/db-mongo.js`) to automatically extract the correct database name from the `SCALINGO_MONGO_URL`.

**Updated Code Snippet in `lib/db-mongo.js`:**
```js
// Function to extract the database name from SCALINGO_MONGO_URL
const getDbName = () => {
  if (process.env.SCALINGO_MONGO_URL) {
    // Example: mongodb://user:pass@host:port/mytodo-jeeazy-368?ssl=true&replicaSet=...
    const withoutOptions = process.env.SCALINGO_MONGO_URL.split('?')[0];
    return withoutOptions.substring(withoutOptions.lastIndexOf('/') + 1);
  }
  return 'todos';
};

const DB_NAME = getDbName(); // Use the extracted DB name
const COLLECTION_NAME = 'todos';
// ... rest of the module code ...
```
This change ensures that the app connects to the database provided by Scalingo (e.g., `mytodo-jeeazy-368`), which resolves the unauthorized error.

### 6. Final Deployment and Verification

- Committed the changes:
  ```bash
  git add .
  git commit -m "Adaptation of MongoDB connection for Scalingo via SCALINGO_MONGO_URL"
  git push scalingo master
  ```
- Logs now display:
  ```
  ✅ Connexion à MongoDB réussie sur la base: mytodo-jeeazy-368
  ```
- Verified that the API endpoints (e.g., GET, POST `/api/todos`) work correctly, storing data in MongoDB.

### 7. Monitoring and Next Steps

- Monitor the logs with:
  ```bash
  scalingo logs -a mytodo-jeeazy -f
  ```
- Ensure all deployment steps and database operations are successful.

---

## Links and References

- **Deployed App on Scalingo:**  
  [https://mytodo-jeeazy.osc-fr1.scalingo.io](https://mytodo-jeeazy.osc-fr1.scalingo.io)

- **GitHub Repository (Forked):**  
  [https://github.com/Jeeazy971/mytodo](https://github.com/Jeeazy971/mytodo)

---

This README documents the entire evolution of the project—from the original deployment on IBM Cloud/Kubernetes to the adaptations and fixes required for deploying on Scalingo with MongoDB. It details all the issues encountered and the solutions applied.

Feel free to contribute or suggest improvements!
