import re

from typing import Dict, List, Optional, Tuple


# [[Give me NUM FOO BAR WHATEVER names]]
SECTION_HEADER_PATTERN = re.compile(r"^\[\[Give me \d+ (.+) names ?.*\]\]$")


class SectionType:
    def __init__(
        self,
        *,
        name: str,
        gender: Optional[str] = None,
    ) -> None:
        self.name = name
        self.gender = gender

    def __str__(self) -> str:
        gender = "Any"
        if self.gender is not None:
            gender = self.gender
        return f"{self.name} - {gender}"

    def without_gender(self) -> "SectionType":
        return SectionType(name=self.name, gender=None)


def match_section_header(line: str) -> Optional[SectionType]:
    match = SECTION_HEADER_PATTERN.match(line)
    if match is None:
        return None
    name = match.group(1)
    name = name.replace("(genre)", "Genre")
    gender: Optional[str] = None
    if name.startswith("male "):
        name = name[5:]
        gender = "Male"
    if name.startswith("female "):
        name = name[7:]
        gender = "Female"
    return SectionType(name=name, gender=gender)


# NUM. foo bar whatever
STRIP_NUMBERING_PATTERN = re.compile(r"^\d+\.\s*(.+)$")


def strip_numbering(line: str) -> str:
    match = STRIP_NUMBERING_PATTERN.match(line)
    if match is None:
        return line
    else:
        return match.group(1)


class Section:
    def __init__(self, section_type: SectionType) -> None:
        self.section_type = section_type
        self.prompts: List[str] = []

    def add_prompt(self, prompt: str) -> None:
        self.prompts.append(prompt)


def categorize_prompts(lines: List[str]) -> Dict[Tuple[str, Optional[str]], Section]:
    sections: Dict[Tuple[str, Optional[str]], Section] = {}
    current_section: Optional[Section] = None

    for line in lines:
        line = line.strip()
        if line == "":
            continue

        section_type = match_section_header(line)
        if section_type is not None:
            current_section = Section(section_type)
            sections[section_type.name, section_type.gender] = current_section
            continue

        if current_section is None:
            raise ValueError("No section header found before prompt")

        current_section.add_prompt(strip_numbering(line))

    # Merge gendered sections into genderless sections.
    for section in sections.values():
        if section.section_type.gender is None:
            continue
        genderless_type = section.section_type.without_gender()
        genderless_key = (genderless_type.name, genderless_type.gender)
        for prompt in section.prompts:
            sections[genderless_key].add_prompt(prompt)

    return sections


def read_prompts(path: str) -> List[str]:
    with open(path, "r", encoding="utf-8") as f:
        return f.readlines()


def print_sections(sections: Dict[Tuple[str, Optional[str]], Section]) -> None:
    for section in sections.values():
        print(f"Section: {section.section_type}")
        for prompt in section.prompts:
            print(f"  {prompt}")

    # print only the section names
    print("Sections:")
    section_names: List[SectionType] = []
    for section in sections.values():
        section_names.append(section.section_type)
    section_names.sort(key=lambda x: str(x))
    for section in section_names:
        print(f"  {section}")


def dump_sections_to_files(sections: Dict[Tuple[str, Optional[str]], Section]) -> None:
    # place into: categorized/SECTION_TYPE.txt
    for section in sections.values():
        filename = f"categorized/{section.section_type}.txt"
        with open(filename, "w", encoding="utf-8") as f:
            prompts = sorted(list(set(section.prompts)))
            first = True
            for prompt in prompts:
                if not first:
                    f.write("\n")
                f.write(prompt)
                first = False


def main() -> None:
    filename = "prompts.txt"
    lines = read_prompts(filename)

    sections = categorize_prompts(lines)
    print_sections(sections)
    dump_sections_to_files(sections)


if __name__ == "__main__":
    main()
