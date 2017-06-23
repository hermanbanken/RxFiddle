#!/bin/bash
make
head=`cat ../.git/refs/heads/master`
filename=paper-herman-${head:0:8}-$(date +'%Y-%m-%d').pdf
mv paper.pdf $filename
