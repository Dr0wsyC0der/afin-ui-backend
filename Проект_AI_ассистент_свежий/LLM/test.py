# How to convert string dict to dict in python
# import ast
# num = "{'a': 2}"
# print(f"{num} | Type: {type(num)}")
# num = ast.literal_eval(num)
# print(f"{num} | Type: {type(num)}")

numbers = []
while True:
  num = int(input())
  if num == 0:
    break
  numbers.append(num)

new_nums = []
for i in numbers:
  if i % len(numbers) == 0:
    new_nums.append(i)
print(new_nums)