# 戰鬥直升機：無盡突圍 - GitHub Pages 部署指南

本專案已配置好完整的 GitHub Actions 自動部署工作流，當您將專案推送到 GitHub 時，會自動進行編譯並部署至 GitHub Pages！

由於您的設定，本專案預設的子路徑為 `/helicopter-survivors-game/`。請按照以下步驟完成設定以確保正常連線：

## 1. 建立對應的 GitHub 儲存庫 (Repository)
* 請務必將 GitHub 上的 Repository 名稱命名為：**`helicopter-survivors-game`**（這與您在 `vite.config.ts` 中設定的 `base: '/helicopter-survivors-game/'` 一致）。
* 若您的 Repository 名稱不同，請到 `vite.config.ts` 修改 `base` 的對應名稱，例如：`/您的新倉庫名稱/`。

## 2. 在 GitHub 上設定權限與啟用 Pages
為了讓自動部署工作流（GitHub Actions）能夠有權限上傳並發布您的網頁，請進入您的 GitHub 倉庫設定頁面：

1. 到專案倉庫首頁，點選上方選單的 **`Settings` (設定)**。
2. 在左側選單點選 **`Actions` -> `General`**。
3. 滾動到最下方的 **`Workflow permissions`**，將權限改為 **`Read and write permissions`**（讀取與寫入權限），並點選 **Save** 儲存。
4. 在左側選單點選 **`Pages`**。
5. 在 **`Build and deployment` -> `Source`** 下拉選單中，請選擇 **`GitHub Actions`**（這會讓 GitHub 使用專案內的 `.github/workflows/deploy.yml` 進行部署）。

## 3. 推送 (Push) 代碼至主分支 (main)
當您將代碼推送到 `main` 分支時，GitHub Actions 會自動開始執行。
* 您可以到 **`Actions`** 分頁查看部署進度。
* 部署完成後，專案就能透過：`https://<您的 GitHub 帳號>.github.io/helicopter-survivors-game/` 成功開啟並遊玩！
