#!/bin/sh
set -e
cp -rnf content/post/* ../myBlog\ -\ 2/content/posts
git add -A
git commit -m "rebuilding site $(date)"
git push 

cd ../myBlog\ -\ 2
git add -A
git commit -m "rebuilding site $(date)"
git push 
