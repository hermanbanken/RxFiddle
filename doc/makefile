TEX = pdflatex -shell-escape -interaction=nonstopmode -file-line-error
#PRE =  $(TEX) -ini -job-name="preamble" "&pdflatex preamble.tex\dump"
FILE = paper
BIB = biber

.PHONY: all view

all : $(FILE).pdf

clean :
	rm paper.aux paper.bbl paper.blg paper.dvi paper.log paper.out

view :
	open $(FILE).pdf

$(FILE).blg : $(FILE).tex $(FILE).aux
	$(BIB) $(FILE)

$(FILE).pdf : $(FILE).tex $(FILE).blg
	$(TEX) $(FILE).tex

$(FILE).aux : $(FILE).tex
	$(TEX) $(FILE).tex
