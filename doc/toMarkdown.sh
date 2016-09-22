pandoc -s -S proposal.tex \
--metadata=link-citations:true \
--bibliography papers/references.bib \
-t markdown_github+grid_tables \
-o proposal.md
