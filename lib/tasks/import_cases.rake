require 'optparse'


namespace :redmine do
  namespace :impasse do
    desc "Import Redmine Impasse test cases."
    task :import => :environment do |t|
      if defined? JRUBY_VERSION
        require 'java'
        
        gem "activerecord-jdbc-adapter"
        require 'axebomber'

        java_import "net.unit8.axebomber.manager.impl.FileSystemBookManager"
        include Axebomber
      end

      raise "You must set RAILS_ENV" unless ENV["RAILS_ENV"]
      raise "You must run in jruby" unless defined? JRUBY_VERSION
      
      input_file = ENV['input'].to_s.strip
      unless File.exist? input_file
        raise "Input file not found."
      end      

      manager = FileSystemBookManager.new
      book = manager.open(input_file)
      sheet = book.getSheet("testcases");
      sheet.titleRowIndex = 0
      if sheet.cell("Node type id").to_i == 1
        identifier = sheet.cell(2).to_s
        @project = Project.find_by_identifier(identifier)
        @root = Impasse::Node.find_by_name_and_node_type_id(identifier, 1)
        rails "Root node not found!" unless @root
        sheet.nextRow
      else
        raise "Root node not found!"
      end

      labelColumns = sheet.tableHeader.labelColumns
      node_from = labelColumns["Node type id"] + 1
      node_to = labelColumns["Details"] - 1
      
      parent_ids = [ @root.id ]
      step_number = 1
      test_case = nil

      ActiveRecord::Base.transaction do
      sheet.rows.each do |row|
        name, level = scan_node_name(row, node_from, node_to)
        node = Impasse::Node.new(:name => name, :node_type_id => row.cell("Node type id").to_i)
        case node.node_type_id
        when 2
          parent_ids = parent_ids[0, level + 1]
          node.parent_id = parent_ids.last
          node.save!
          parent_ids[level] = node.id
          test_suite = Impasse::TestSuite.new(:details => row.cell("Details").to_s)
          test_suite.id = node.id
          test_suite.save!
        when 3
          node.parent_id = parent_ids[level - 1]
          node.save!
          test_case = Impasse::TestCase.new(:preconditions => row.cell("Preconditions").to_s,
                                            :summary => row.cell("Summary").to_s)
          test_case.id = node.id
          test_case.save!
          if row.cell("Actions").to_s != "" or row.cell("Expected results").to_s != ""
            step_number = 1
            test_step = Impasse::TestStep.create(:actions => row.cell("Actions").to_s,
                                              :expected_results => row.cell("Expected results").to_s,
                                              :step_number => step_number,
                                              :test_case_id => test_case.id)
          end
        else
          if row.cell("Actions").to_s != "" or row.cell("Expected results").to_s != ""
            step_number += 1
            test_step = Impasse::TestStep.create(:actions => row.cell("Actions").to_s,
                                              :expected_results => row.cell("Expected results").to_s,
                                              :step_number => step_number,
                                              :test_case_id => test_case.id)
          end
        end
        end
      end
    end

    private
    def scan_node_name(row, node_from, node_to)
      (node_from..node_to).each do |idx|
        return [ row.cell(idx).to_s, idx - node_from ] if row.cell(idx).to_s != ""
      end
      nil
    end
  end
end
