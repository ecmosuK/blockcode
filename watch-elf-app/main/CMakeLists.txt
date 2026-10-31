idf_component_register(SRCS "blockcode-app.cpp")

# BlockCode apps resolve the watch display ABI at runtime through esp_elf_loader.
target_link_options(${COMPONENT_LIB} INTERFACE "LINKER:--unresolved-symbols=ignore-all")
