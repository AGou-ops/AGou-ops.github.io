#!/bin/sh
set -e
hugo && npm run algolia
cp -rnf content/post/* ../myBlog\ -\ 2/content/posts
git add -A
git commit -m "rebuilding site $(date)"
git push 

cd ../myBlog\ -\ 2
hugo && npm run algolia
git add -A
git commit -m "rebuilding site $(date)"
git push 
