TASKS := help install dev start frontend-dev check check-frontend check-rust test test-frontend test-rust build build-frontend package package-portable package-portable-stop clean

ifeq ($(OS),Windows_NT)
RUN_TASK = powershell -NoProfile -ExecutionPolicy Bypass -File scripts/make/task.ps1
else
SHELL := /bin/sh
RUN_TASK = sh scripts/make/task.sh
endif

.PHONY: $(TASKS)

help:
	$(RUN_TASK) help

install:
	$(RUN_TASK) install

dev:
	$(RUN_TASK) dev

start:
	$(RUN_TASK) start

frontend-dev:
	$(RUN_TASK) frontend-dev

check:
	$(RUN_TASK) check

check-frontend:
	$(RUN_TASK) check-frontend

check-rust:
	$(RUN_TASK) check-rust

test:
	$(RUN_TASK) test

test-frontend:
	$(RUN_TASK) test-frontend

test-rust:
	$(RUN_TASK) test-rust

build:
	$(RUN_TASK) build

build-frontend:
	$(RUN_TASK) build-frontend

package:
	$(RUN_TASK) package

package-portable:
	$(RUN_TASK) package-portable

package-portable-stop:
	$(RUN_TASK) package-portable-stop

clean:
	$(RUN_TASK) clean
