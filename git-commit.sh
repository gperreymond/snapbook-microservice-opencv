#!/bin/bash

# run tests
npm test

# if tests are not 100% ok, then no need to commit...
if [ $? -eq 0 ]
  then
    git add -i
    git commit -m "$2"
    git push origin $1
fi