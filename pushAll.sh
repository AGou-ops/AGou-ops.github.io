#!/bin/sh
set -e

rsync -av --progress content/post/* ../myBlog\ -\ 2/content/posts/

/bin/bash ./push.sh

echo "缓一缓"
sleep 1

cd ../myBlog\ -\ 2

/bin/bash ./push.sh
