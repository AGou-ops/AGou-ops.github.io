#!/bin/sh
set -e

rsync -av --progress content/post/* ../myBlog\ -\ 2/content/posts/

/usr/bin/sh ./push.sh

echo "缓一缓"
sleep 1

cd ../myBlog\ -\ 2

/usr/bin/sh ./push.sh