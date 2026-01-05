---
description: Deploy Egg + Tomato to GitHub and Vercel
---

# Deploy to GitHub & Vercel

## 1. Push to GitHub
I have already initialized the git repository and committed the files locally for you.
1. Create a new repository on [GitHub](https://github.com/new). Name it `egg-and-tomato` (or similar).
2. Copy the "HTTPS" or "SSH" URL for the new repo.
3. Run the following command in your terminal (replace `<YOUR_REPO_URL>` with your actual URL):

```bash
git remote add origin <YOUR_REPO_URL>
git push -u origin main
```

## 2. Deploy to Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **"Add New..."** -> **"Project"**.
3. Import from **GitHub**.
4. Select the repository you just pushed.
5. Vercel will detect the framework as **Vite**.
6. Click **Deploy**.

That's it! Vercel will build your PWA and give you a live URL.
