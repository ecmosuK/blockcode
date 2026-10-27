cmake_minimum_required(VERSION 3.16)

include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(blockcode_app)

include(elf_loader)
project_elf(blockcode_app)
