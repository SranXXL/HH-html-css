import unittest
import requests

class TestHHApi(unittest.TestCase):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.url = "https://api.hh.ru/vacancies"

    def _get_vacancies(self, text):
        result = requests.get(self.url, params={'text': text})
        return result.json()

    def _transform_json_to_list(self, response_json):
        vacancies = response_json['items']
        result = []
        for vacancy in vacancies:
            vacancy = str(vacancy).lower()
            result.append(vacancy)
        return result

    def test_connection(self):
        response = requests.get(self.url)
        self.assertEqual(response.status_code, requests.status_codes.codes.ok)

    def test_huge_input(self):
        response = requests.get(self.url,
            params={'text': ''.join('1' for i in range(100000))})
        self.assertEqual(response.status_code, 414)

    def test_basic_operation(self):
        vacancies = self._get_vacancies('продажа оборудования')
        vacancies = self._transform_json_to_list(vacancies)
        words = 'продаж оборудовани'.split()
        for vacancy in vacancies:
            for word in words:
                self.assertIn(word, vacancy)

    def test_search_phrase(self):
        vacancies = self._get_vacancies('"продажа оборудования"')
        vacancies = self._transform_json_to_list(vacancies)
        for vacancy in vacancies:
            self.assertRegex(
                str(vacancy),
                r'продаж.{0,2}\sоборудовани.{0,2}')
         
    def test_search_different_forms_of_word(self):
        vacancies = self._get_vacancies('продажа')
        vacancies = self._transform_json_to_list(vacancies)
        for vacancy in vacancies:
            self.assertIn('продаж', vacancy)

    def test_search_one_form_of_word(self):
        vacancies = self._get_vacancies('!продажи')
        vacancies = self._transform_json_to_list(vacancies)
        for vacancy in vacancies:
            self.assertIn('продажи', vacancy)

    def test_search_using_part_of_word(self):
        vacancies = self._get_vacancies('Гео*')
        vacancies = self._transform_json_to_list(vacancies)
        for vacancy in vacancies:
            self.assertRegex(vacancy, 'гео*')
            
    def test_search_synonymus(self):
        vacancies = self._get_vacancies('pr-менеджер')
        vacancies = self._transform_json_to_list(vacancies)
        self.assertTrue(any('менеджер по связям с общественностью' in words
            for words in vacancies))
            
    def test_search_one_of_the_words(self):
        vacancies = self._get_vacancies('учитель OR космонавт')
        vacancies = self._transform_json_to_list(vacancies)
        for vacancy in vacancies:
            self.assertTrue('учитель' in vacancy or 'космонавт' in vacancy)

    def tets_search_one_of_phrases(self):
        vacancies = self._get_vacancies('"активные продажи" OR "прямые продажи"')
        vacancies = self._transform_json_to_list(vacancies)
        for vacancy in vacancies:
            self.assertTrue(
                r'активн.{2,3}\sпродаж.{0,2}' in vacancy or
                r'прям.{2,3}\sпродаж.{0,2}'
            )
        
    def test_search_all_words(self):
        vacancies = self._get_vacancies('"ремонт и" AND "техническое обслуживание"')
        vacancies = self._transform_json_to_list(vacancies)
        only_text = []
        for vacancy in vacancies:
            vacancy = vacancy.replace('<highlighttext>', '')
            vacancy = vacancy.replace('</highlighttext>', '')
            only_text.append(vacancy)
        for vacancy in only_text:
            self.assertRegex(vacancy, r'ремонт.{0,2}\sи')
            self.assertRegex(vacancy, r'техническ.{2,4}\sобслуживани.{1,3}')
       
    def test_exclude_word(self):
        vacancies = self._get_vacancies('учитель NOT математики')
        vacancies = self._transform_json_to_list(vacancies)
        for vacancy in vacancies:
            self.assertIn('учител', vacancy)
            self.assertNotIn('математики', vacancy)

    def test_search_using_fields(self):
        vacancies = self._get_vacancies(
            'NAME:(python OR java) and COMPANY_NAME:HeadHunter')['items']
        for vacancy in vacancies:
            vacancy_name = vacancy['name']
            vacancy_name = str(vacancy_name).lower()
            self.assertTrue('python' in vacancy_name or 'java' in vacancy_name)
            self.assertIn('HeadHunter', vacancy['employer']['name'])

    def test_incorrect_fields(self):
        vacancies = self._get_vacancies(
            'NAMES:(python OR java) and COMPANY_NAMES:HeadHunter')
        self.assertEqual(vacancies['found'], 0)

    def test_incorrect_input(self):
        vacancies = self._get_vacancies('бумшакалака')
        self.assertEqual(vacancies['found'], 0)

if __name__ == '__main__':
    unittest.main()
