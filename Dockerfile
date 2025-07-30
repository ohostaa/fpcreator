FROM nginx:alpine

# 作業ディレクトリを設定
WORKDIR /usr/share/nginx/html

# HTMLファイルをコピー
COPY index.html .

# 画像フォルダをコピー
COPY image/ ./image/

# カスタムnginx設定をコピー
COPY nginx.conf /etc/nginx/nginx.conf

# ポート80を公開
EXPOSE 80

# nginxを起動
CMD ["nginx", "-g", "daemon off;"]
