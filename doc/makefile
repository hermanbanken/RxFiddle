TEX = pdflatex -shell-escape -interaction=nonstopmode -file-line-error
PRE =  $(TEX) -ini -job-name="preamble" "&pdflatex preamble.tex\dump"
BIB = bibtex
FILE = paper

.PHONY: all view

all : $(FILE).pdf

view :
	open $(FILE).pdf

$(FILE).pdf : $(FILE).tex preamble.fmt $(FILE).bbl $(FILE).blg
	$(TEX) $(FILE).tex

$(FILE).bbl $(FILE).blg : $(FILE).bib $(FILE).aux
	$(BIB) $(FILE)

$(FILE).aux : $(FILE).tex
	$(TEX) $(FILE).tex

$(FILE).bib : $(FILE).tex
	$(TEX) $(FILE).tex

preamble.fmt : preamble.tex
	$(PRE) preamble.tex
