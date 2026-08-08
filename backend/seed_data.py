"""
Business Vahi Seed Data
Excel functions and tutorials reference data
"""

EXCEL_FUNCTIONS = [
    {"name": "SUM", "category": "Math", "description": "Adds all numbers in a range", "syntax": "=SUM(number1, [number2], ...)", "example": "=SUM(A1:A10)"},
    {"name": "AVERAGE", "category": "Math", "description": "Returns the average of numbers", "syntax": "=AVERAGE(number1, [number2], ...)", "example": "=AVERAGE(B1:B10)"},
    {"name": "COUNT", "category": "Math", "description": "Counts cells with numbers", "syntax": "=COUNT(value1, [value2], ...)", "example": "=COUNT(A1:A100)"},
    {"name": "COUNTA", "category": "Math", "description": "Counts non-empty cells", "syntax": "=COUNTA(value1, [value2], ...)", "example": "=COUNTA(A1:A100)"},
    {"name": "IF", "category": "Logical", "description": "Returns one value if condition is true, another if false", "syntax": "=IF(logical_test, value_if_true, value_if_false)", "example": "=IF(A1>100, \"High\", \"Low\")"},
    {"name": "VLOOKUP", "category": "Lookup", "description": "Searches for a value in the first column of a table", "syntax": "=VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])", "example": "=VLOOKUP(A2, B:D, 2, FALSE)"},
    {"name": "HLOOKUP", "category": "Lookup", "description": "Searches for a value in the first row of a table", "syntax": "=HLOOKUP(lookup_value, table_array, row_index_num, [range_lookup])", "example": "=HLOOKUP(A1, 1:3, 2, FALSE)"},
    {"name": "INDEX", "category": "Lookup", "description": "Returns a value from a range at a given position", "syntax": "=INDEX(array, row_num, [col_num])", "example": "=INDEX(A1:C10, 3, 2)"},
    {"name": "MATCH", "category": "Lookup", "description": "Returns the position of a value in a range", "syntax": "=MATCH(lookup_value, lookup_array, [match_type])", "example": "=MATCH(\"Apple\", A1:A10, 0)"},
    {"name": "CONCATENATE", "category": "Text", "description": "Joins multiple text strings into one", "syntax": "=CONCATENATE(text1, [text2], ...)", "example": "=CONCATENATE(A1, \" \", B1)"},
    {"name": "LEFT", "category": "Text", "description": "Returns leftmost characters from text", "syntax": "=LEFT(text, [num_chars])", "example": "=LEFT(A1, 3)"},
    {"name": "RIGHT", "category": "Text", "description": "Returns rightmost characters from text", "syntax": "=RIGHT(text, [num_chars])", "example": "=RIGHT(A1, 4)"},
    {"name": "MID", "category": "Text", "description": "Returns characters from the middle of text", "syntax": "=MID(text, start_num, num_chars)", "example": "=MID(A1, 2, 5)"},
    {"name": "LEN", "category": "Text", "description": "Returns the length of text", "syntax": "=LEN(text)", "example": "=LEN(A1)"},
    {"name": "TRIM", "category": "Text", "description": "Removes extra spaces from text", "syntax": "=TRIM(text)", "example": "=TRIM(A1)"},
    {"name": "UPPER", "category": "Text", "description": "Converts text to uppercase", "syntax": "=UPPER(text)", "example": "=UPPER(A1)"},
    {"name": "LOWER", "category": "Text", "description": "Converts text to lowercase", "syntax": "=LOWER(text)", "example": "=LOWER(A1)"},
    {"name": "TODAY", "category": "Date", "description": "Returns today's date", "syntax": "=TODAY()", "example": "=TODAY()"},
    {"name": "NOW", "category": "Date", "description": "Returns current date and time", "syntax": "=NOW()", "example": "=NOW()"},
    {"name": "YEAR", "category": "Date", "description": "Returns the year from a date", "syntax": "=YEAR(serial_number)", "example": "=YEAR(A1)"},
    {"name": "MONTH", "category": "Date", "description": "Returns the month from a date", "syntax": "=MONTH(serial_number)", "example": "=MONTH(A1)"},
    {"name": "DAY", "category": "Date", "description": "Returns the day from a date", "syntax": "=DAY(serial_number)", "example": "=DAY(A1)"},
    {"name": "SUMIF", "category": "Math", "description": "Adds cells that meet a condition", "syntax": "=SUMIF(range, criteria, [sum_range])", "example": "=SUMIF(A1:A10, \"Apples\", B1:B10)"},
    {"name": "COUNTIF", "category": "Math", "description": "Counts cells that meet a condition", "syntax": "=COUNTIF(range, criteria)", "example": "=COUNTIF(A1:A10, \">100\")"},
    {"name": "SUMIFS", "category": "Math", "description": "Adds cells that meet multiple conditions", "syntax": "=SUMIFS(sum_range, criteria_range1, criteria1, ...)", "example": "=SUMIFS(C1:C10, A1:A10, \"Apples\", B1:B10, \">50\")"},
    {"name": "MAX", "category": "Math", "description": "Returns the largest value", "syntax": "=MAX(number1, [number2], ...)", "example": "=MAX(A1:A10)"},
    {"name": "MIN", "category": "Math", "description": "Returns the smallest value", "syntax": "=MIN(number1, [number2], ...)", "example": "=MIN(A1:A10)"},
    {"name": "ROUND", "category": "Math", "description": "Rounds a number to specified digits", "syntax": "=ROUND(number, num_digits)", "example": "=ROUND(3.14159, 2)"},
    {"name": "PMT", "category": "Finance", "description": "Calculates loan payment amount", "syntax": "=PMT(rate, nper, pv)", "example": "=PMT(5%/12, 60, -100000)"},
    {"name": "NPV", "category": "Finance", "description": "Calculates net present value", "syntax": "=NPV(rate, value1, [value2], ...)", "example": "=NPV(10%, B2:B6)"},
]

TUTORIALS = [
    {"title": "Getting Started with Excel", "category": "Basics", "level": "Beginner", "description": "Learn the basics of Excel — cells, rows, columns, and simple formulas.", "duration": "15 min"},
    {"title": "SUM and AVERAGE Functions", "category": "Formulas", "level": "Beginner", "description": "Master the most used Excel functions for adding and averaging numbers.", "duration": "10 min"},
    {"title": "VLOOKUP Deep Dive", "category": "Lookup", "level": "Intermediate", "description": "Learn VLOOKUP to search and retrieve data from tables automatically.", "duration": "20 min"},
    {"title": "IF Function and Logic", "category": "Logic", "level": "Intermediate", "description": "Use IF, AND, OR functions to make smart decisions in your spreadsheets.", "duration": "15 min"},
    {"title": "Pivot Tables", "category": "Analysis", "level": "Intermediate", "description": "Summarize large amounts of data instantly with Pivot Tables.", "duration": "25 min"},
    {"title": "Charts and Graphs", "category": "Visualization", "level": "Beginner", "description": "Create professional charts to visualize your business data.", "duration": "15 min"},
    {"title": "Conditional Formatting", "category": "Formatting", "level": "Beginner", "description": "Automatically highlight cells based on their values.", "duration": "10 min"},
    {"title": "INDEX MATCH", "category": "Lookup", "level": "Advanced", "description": "A more powerful alternative to VLOOKUP for two-way lookups.", "duration": "20 min"},
    {"title": "Data Validation", "category": "Data", "level": "Intermediate", "description": "Control what data can be entered in cells using dropdown lists.", "duration": "10 min"},
    {"title": "GST Calculations in Excel", "category": "Business", "level": "Intermediate", "description": "Calculate CGST, SGST, IGST automatically in Excel for Indian businesses.", "duration": "20 min"},
]
