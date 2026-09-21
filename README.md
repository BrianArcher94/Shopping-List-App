# Shopping List App
Welcome to the Shopping List App. This repo contains the many versions of my Shopping List App. The idea behind this project is that the frontend app will remain the same but there will be multiple different backend architectures.

## Version Strategy

Each version is isolated in its own repository and differs ONLY by backend + hosting:

| Version | Hosting | Backend | Auth | Status |
|--------|--------|--------|------| ------|
| 1 | Power Apps Code App | Dataverse | Default | ✅ |
| 2 | Azure Web App | Table Storage | Default   | ✅ |
| 3 | Azure Web App | Azure SQL | Default | ✅ |
| 4 | Azure Web App | Azure SQL | Entra External ID  | 👀 |
| 5 | Azure Web App | PostgreSQL | Default |
| 6 | Azure Web App | Cosmos DB | Default |
| 7 | Azure Container Apps | Azure SQL | Default |
| 8 | AKS | Azure SQL | Default |

---

## Global Architectural Principles

### 1. Infrastructure

- ALL Azure resources deployed via Terraform (Versions 2–8)
- One Terraform root per version
- No manual resource creation

---

### 2. Security

- Use Managed Identity for ALL service-to-service communication
- No secrets stored in code
- Use least privilege RBAC assignments
- All data services must use Private Endpoints

---

## Key Features
- Add items to the current week list
- Add items to favourites for easy future use
- Mark list as delivered and ordered, this makes the list read-only
- View previous lists

---

## Video Demonstration
[![Shopping List App](https://img.youtube.com/vi/MPbwgdBg8wA/0.jpg)](https://www.youtube.com/watch?v=MPbwgdBg8wA)